use std::collections::BTreeMap;

use chrono::{DateTime, Duration, Utc};
use napi::Result;
use sha2::{Digest, Sha256};

#[cfg(test)]
use super::RuntimeQuotaSourceInput;
use super::{
  InviteQuotaConfig, RuntimeQuotaTargetDomainInput, RuntimeWorkspaceInviteQuotaInput, ScopeLimit, bucket_seconds,
  high_risk_domain, napi_error, normalize_domain, scope, short_hash, source_prefix, workspace_subject_key,
};
use crate::llm::Deployment;

// ---------------------------------------------------------------------------
// Self-host invite ceiling
// ---------------------------------------------------------------------------
// self-host 是私有可信部署，不需要 Cloud 面向陌生用户的账号年龄 / 邮箱验证 /
// 接受率 / 高风险域名风控。但仍保留一个按席位推导的上界，用来兜住误操作
// （例如脚本把整本通讯录一次性灌进来）。
//
// 512 与 GraphQL 层 `inviteMembers` 的 emails.length 上限对齐。
// ---------------------------------------------------------------------------
const SELFHOST_INVITE_BURST_CEILING: i32 = 512;

#[derive(Clone, Debug)]
pub(super) struct ActorFacts {
  pub(super) email: String,
  pub(super) created_at: DateTime<Utc>,
  pub(super) registered: bool,
  pub(super) email_verified: bool,
  pub(super) disabled: bool,
}

#[derive(Clone, Debug)]
pub(super) struct QuotaFacts {
  pub(super) plan: String,
  pub(super) owner_user_id: Option<String>,
  pub(super) uses_owner_quota: bool,
  pub(super) seat_limit: i32,
  pub(super) member_count: i32,
  pub(super) known: bool,
  pub(super) stale: bool,
  pub(super) stale_after: Option<DateTime<Utc>>,
}

#[derive(Clone, Debug)]
pub(super) struct WorkspaceFacts {
  pub(super) created_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Default)]
pub(super) struct InviteActivityFacts {
  pub(super) actor_created_7d: i32,
  pub(super) actor_accepted_7d: i32,
  pub(super) workspace_pending: i32,
  pub(super) workspace_created_7d: i32,
  pub(super) workspace_accepted_7d: i32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(super) struct InviteAbuseDecision {
  pub(super) reason: &'static str,
  pub(super) action: &'static str,
  pub(super) subject_kind: &'static str,
  pub(super) subject_key: String,
}

pub(super) fn subject_hash(email: &str, config: &InviteQuotaConfig) -> String {
  let normalized = email.trim().to_ascii_lowercase();
  let hash = Sha256::digest(format!("{}:{normalized}", config.subject_hash_salt).as_bytes());
  format!("actor_email_sha256:v1:{}", hex::encode(hash))
}

pub(super) fn source_cohort_subject_key(prefix: &str, domain: &str) -> String {
  format!(
    "source_prefix_domain_sha256:v1:{}",
    short_hash(&format!("{}:{}", prefix, normalize_domain(domain)))
  )
}

fn quota_subject(workspace_id: &str, quota: &QuotaFacts) -> (String, i32) {
  if quota.uses_owner_quota || !quota.plan.to_ascii_lowercase().contains("team") {
    (
      format!("owner:{}", quota.owner_user_id.as_deref().unwrap_or(workspace_id)),
      quota.seat_limit,
    )
  } else {
    (format!("workspace:{workspace_id}"), quota.seat_limit)
  }
}

fn plan_ceiling_7d(deployment: Deployment, plan: &str, seat_limit: i32) -> i32 {
  // Cloud 按 plan 给死上限（免费档 10/周），self-host 直接按席位走，
  // 否则 seat_limit 放到 1000 也会被周窗口卡在 10。
  if deployment == Deployment::SelfHosted {
    return seat_limit.max(1);
  }

  let normalized = plan.to_ascii_lowercase();
  if normalized.contains("enterprise") || normalized.contains("team") && !normalized.contains("trial") {
    seat_limit.saturating_mul(2)
  } else if normalized.contains("trial") {
    50
  } else if normalized.contains("pro") {
    20
  } else {
    10
  }
}

fn base_invite_limits(
  deployment: Deployment,
  now: DateTime<Utc>,
  actor: &ActorFacts,
  workspace: &WorkspaceFacts,
  quota: &QuotaFacts,
  activity: &InviteActivityFacts,
) -> (i32, i32, i32, i32) {
  // 账号被禁用 / 未注册是真实账号状态，任何部署形态下都不放行。
  if actor.disabled || !actor.registered {
    return (0, 0, 0, 0);
  }

  // self-host 只保留席位上界，跳过后面全部 Cloud anti-abuse 收紧
  // （<24h 新账号一刀切归零、邮箱未验证降级、workspace 冷启动折半、
  //   低接受率惩罚等）。
  if deployment == Deployment::SelfHosted {
    let ceiling = quota.seat_limit.clamp(1, SELFHOST_INVITE_BURST_CEILING);
    return (ceiling, ceiling, ceiling, ceiling);
  }

  let account_age = now - actor.created_at;
  let workspace_age = now - workspace.created_at;
  let mut single = 5;
  let mut per_hour = 5;
  let mut per_day = 15;
  let mut per_week = 30;

  if account_age < Duration::hours(24) {
    return (0, 0, 0, 0);
  }
  if !actor.email_verified {
    single = 1;
    per_hour = 1;
    per_day = 3;
    per_week = 5;
  } else if account_age < Duration::days(7) {
    single = 3;
    per_hour = 3;
    per_day = 5;
    per_week = 10;
  } else if account_age < Duration::days(30) {
    single = 5;
    per_hour = 5;
    per_day = 15;
    per_week = 30;
  } else {
    let plan = quota.plan.to_ascii_lowercase();
    if plan.contains("team") && !plan.contains("trial") {
      single = quota.seat_limit.min(20);
      per_hour = 20;
      per_day = 50;
    } else if plan.contains("trial") {
      single = 10;
      per_hour = 10;
      per_day = 30;
      per_week = 80;
    } else if plan.contains("pro") {
      single = 8;
      per_hour = 8;
      per_day = 20;
      per_week = 50;
    }
  }

  if workspace_age < Duration::hours(24) || quota.member_count <= 1 {
    single = single.min(3);
    per_day = per_day.min(10);
  } else if workspace_age < Duration::days(7) || quota.member_count <= 5 {
    single = single.min((single as f32 * 0.5).ceil() as i32).max(1);
    per_hour = per_hour.min((per_hour as f32 * 0.5).ceil() as i32).max(1);
    per_day = per_day.min((per_day as f32 * 0.5).ceil() as i32).max(1);
  }

  if activity.workspace_pending > quota.seat_limit.saturating_mul(2).max(6) {
    single = single.min(2);
    per_day = per_day.min(5);
  }
  if activity.actor_created_7d >= 5 && activity.actor_accepted_7d.saturating_mul(10) < activity.actor_created_7d {
    single = single.min(2);
    per_hour = per_hour.min(2);
    per_day = per_day.min(5);
    per_week = per_week.min(10);
  }
  if activity.workspace_created_7d >= 10
    && activity.workspace_accepted_7d.saturating_mul(10) < activity.workspace_created_7d
  {
    per_day = per_day.min(10);
    per_week = per_week.min(20);
  }

  let seat_7d = plan_ceiling_7d(deployment, &quota.plan, quota.seat_limit).min(quota.seat_limit.saturating_mul(2));
  (single, per_hour, per_day, per_week.min(seat_7d))
}

pub(super) fn evaluate_projection(quota: &QuotaFacts, now: DateTime<Utc>) -> Option<&'static str> {
  if !quota.known {
    return Some("quota_state_unavailable");
  }
  if quota.stale || quota.stale_after.is_some_and(|stale_after| stale_after <= now) {
    return Some("quota_projection_stale");
  }
  None
}

pub(super) fn build_invite_scopes(
  deployment: Deployment,
  input: &RuntimeWorkspaceInviteQuotaInput,
  actor: &ActorFacts,
  workspace: &WorkspaceFacts,
  quota: &QuotaFacts,
  activity: &InviteActivityFacts,
  config: &InviteQuotaConfig,
  now: DateTime<Utc>,
) -> Result<Vec<ScopeLimit>> {
  if input.target_count <= 0 {
    return Err(napi_error("target_count must be positive"));
  }
  let (single, per_hour, per_day, per_week) = base_invite_limits(deployment, now, actor, workspace, quota, activity);
  if input.target_count > single {
    return Ok(vec![ScopeLimit {
      scope_key: format!("invite:single_request:{}", input.actor_user_id),
      window_seconds: 60,
      bucket_seconds: bucket_seconds(60),
      limit: single,
      requested: input.target_count,
    }]);
  }

  let actor_subject = subject_hash(&actor.email, config);
  let (quota_subject, seat_limit) = quota_subject(&input.workspace_id, quota);
  let quota_subject_7d = plan_ceiling_7d(deployment, &quota.plan, seat_limit).min(seat_limit.saturating_mul(2));
  let mut scopes = vec![
    scope(
      format!("invite:user:{}", input.actor_user_id),
      3600,
      per_hour,
      input.target_count,
    ),
    scope(
      format!("invite:user:{}", input.actor_user_id),
      86_400,
      per_day,
      input.target_count,
    ),
    scope(
      format!("invite:user:{}", input.actor_user_id),
      604_800,
      per_week,
      input.target_count,
    ),
    scope(
      format!("invite:actor_subject:{actor_subject}"),
      604_800,
      per_week,
      input.target_count,
    ),
    scope(
      format!("invite:workspace:{}", input.workspace_id),
      3600,
      per_hour.max(5),
      input.target_count,
    ),
    scope(
      format!("invite:workspace:{}", input.workspace_id),
      86_400,
      per_day.max(10),
      input.target_count,
    ),
    scope(
      format!("invite:quota_subject:{quota_subject}"),
      604_800,
      quota_subject_7d,
      input.target_count,
    ),
  ];

  for target in &input.target_domains {
    let domain = normalize_domain(&target.domain);
    let limit_7d = if high_risk_domain(&domain, config) {
      quota_subject_7d.min((seat_limit / 2).max(2))
    } else {
      quota_subject_7d
    };
    scopes.push(scope(
      format!("invite:user_domain:{}:{domain}", input.actor_user_id),
      86_400,
      per_day.min(limit_7d).max(1),
      target.count,
    ));
    scopes.push(scope(
      format!("invite:workspace_domain:{}:{domain}", input.workspace_id),
      86_400,
      per_day.max(10).min(limit_7d).max(1),
      target.count,
    ));
    scopes.push(scope(
      format!("invite:quota_subject_domain:{quota_subject}:{domain}"),
      604_800,
      limit_7d,
      target.count,
    ));
    scopes.push(scope(
      format!("invite:target_domain_global:{domain}"),
      60,
      if high_risk_domain(&domain, config) { 30 } else { 100 },
      target.count,
    ));
    scopes.push(scope(
      format!("invite:target_domain_global:{domain}"),
      86_400,
      if high_risk_domain(&domain, config) { 500 } else { 2000 },
      target.count,
    ));
  }

  if let Some(prefix) = source_prefix(input.source.as_ref()) {
    scopes.push(scope(
      format!("invite:source_prefix:{prefix}"),
      3600,
      30,
      input.target_count,
    ));
    scopes.push(scope(
      format!("invite:source_prefix:{prefix}"),
      86_400,
      100,
      input.target_count,
    ));
    for target in &input.target_domains {
      let domain = normalize_domain(&target.domain);
      scopes.push(scope(
        format!("invite:source_prefix_domain:{prefix}:{domain}"),
        3600,
        if high_risk_domain(&domain, config) { 5 } else { 15 },
        target.count,
      ));
      scopes.push(scope(
        format!("invite:source_prefix_domain:{prefix}:{domain}"),
        86_400,
        if high_risk_domain(&domain, config) { 15 } else { 50 },
        target.count,
      ));
    }
  }

  if input.source.as_ref().is_some_and(|source| source.trusted)
    && let Some(asn) = input.source.as_ref().and_then(|source| source.asn)
  {
    for target in &input.target_domains {
      let domain = normalize_domain(&target.domain);
      scopes.push(scope(
        format!("invite:source_asn_domain:{asn}:{domain}"),
        3600,
        if high_risk_domain(&domain, config) { 50 } else { 150 },
        target.count,
      ));
      scopes.push(scope(
        format!("invite:source_asn_domain:{asn}:{domain}"),
        86_400,
        if high_risk_domain(&domain, config) { 150 } else { 500 },
        target.count,
      ));
    }
  }

  Ok(scopes)
}

pub(super) fn high_confidence_invite_abuse(
  deployment: Deployment,
  input: &RuntimeWorkspaceInviteQuotaInput,
  actor: &ActorFacts,
  config: &InviteQuotaConfig,
) -> Option<InviteAbuseDecision> {
  // quarantine / ban 是公共服务的滥用治理手段，self-host 不做这类处置，
  // 也就不会往 runtime_invite_abuse_* 里写新的封禁主体。
  if deployment == Deployment::SelfHosted {
    return None;
  }

  let high_risk_domain_counts: Vec<(String, i32)> = input
    .target_domains
    .iter()
    .filter(|target| high_risk_domain(&target.domain, config))
    .map(|target| (normalize_domain(&target.domain), target.count.max(0)))
    .collect();
  let high_risk_targets: i32 = high_risk_domain_counts.iter().map(|(_, count)| *count).sum();

  if !actor.email_verified && high_risk_targets >= 3 {
    return Some(InviteAbuseDecision {
      reason: "unverified_high_risk_domain_burst",
      action: "quarantine_actor",
      subject_kind: "actor_email",
      subject_key: subject_hash(&actor.email, config),
    });
  }

  if input.target_count >= 30 && high_risk_targets * 2 >= input.target_count {
    return Some(InviteAbuseDecision {
      reason: "workspace_high_risk_domain_burst",
      action: "quarantine_workspace",
      subject_kind: "workspace",
      subject_key: workspace_subject_key(&input.workspace_id),
    });
  }

  if let Some(prefix) = source_prefix(input.source.as_ref())
    && high_risk_targets >= 10
    && high_risk_targets * 2 >= input.target_count
    && let Some((domain, _)) = high_risk_domain_counts.iter().max_by_key(|(_, count)| *count)
  {
    return Some(InviteAbuseDecision {
      reason: "source_high_risk_domain_burst",
      action: "quarantine_source_cohort",
      subject_kind: "source_prefix_domain",
      subject_key: source_cohort_subject_key(&prefix, domain),
    });
  }

  if input.target_count >= 10 && high_risk_targets * 2 >= input.target_count {
    return Some(InviteAbuseDecision {
      reason: "high_risk_domain_burst",
      action: if input.target_count >= 20 {
        "ban_actor"
      } else {
        "quarantine_actor"
      },
      subject_kind: "actor_email",
      subject_key: subject_hash(&actor.email, config),
    });
  }

  None
}

pub(super) fn sum_domains(target_domains: &[RuntimeQuotaTargetDomainInput]) -> BTreeMap<String, i32> {
  let mut domains = BTreeMap::new();
  for domain in target_domains {
    *domains.entry(normalize_domain(&domain.domain)).or_insert(0) += domain.count.max(0);
  }
  domains
}

pub(super) fn invite_commit_usage_for_scope(
  scope_key: &str,
  target_count: i32,
  domain_usage: &BTreeMap<String, i32>,
) -> i32 {
  for (domain, count) in domain_usage {
    if scope_key.ends_with(&format!(":{domain}")) {
      return *count;
    }
  }
  target_count
}

#[cfg(test)]
mod tests {
  use chrono::TimeZone;

  use super::*;

  fn user(created_at: DateTime<Utc>) -> ActorFacts {
    ActorFacts {
      email: "actor@example.com".to_string(),
      created_at,
      registered: true,
      email_verified: true,
      disabled: false,
    }
  }

  fn workspace(created_at: DateTime<Utc>) -> WorkspaceFacts {
    WorkspaceFacts { created_at }
  }

  fn quota(plan: &str, seat_limit: i32) -> QuotaFacts {
    QuotaFacts {
      plan: plan.to_string(),
      owner_user_id: Some("owner-1".to_string()),
      uses_owner_quota: false,
      seat_limit,
      member_count: 10,
      known: true,
      stale: false,
      stale_after: None,
    }
  }

  fn invite_config() -> InviteQuotaConfig {
    InviteQuotaConfig::default()
  }

  #[test]
  fn seat_based_weekly_limit_binds_paid_team_and_high_risk_domain() {
    let now = Utc.with_ymd_and_hms(2026, 7, 6, 0, 0, 0).single().unwrap();
    let input = RuntimeWorkspaceInviteQuotaInput {
      actor_user_id: "u1".to_string(),
      workspace_id: "w1".to_string(),
      request_id: None,
      target_count: 5,
      target_domains: vec![RuntimeQuotaTargetDomainInput {
        domain: "qq.com".to_string(),
        count: 5,
      }],
      source: None,
    };
    let scopes = build_invite_scopes(
      Deployment::Cloud,
      &input,
      &user(now - Duration::days(60)),
      &workspace(now - Duration::days(60)),
      &quota("paid_team", 10),
      &InviteActivityFacts::default(),
      &invite_config(),
      now,
    )
    .unwrap();
    let quota_subject = scopes
      .iter()
      .find(|scope| scope.scope_key == "invite:quota_subject:workspace:w1" && scope.window_seconds == 604_800)
      .unwrap();
    assert_eq!(quota_subject.limit, 20);
    let high_risk = scopes
      .iter()
      .find(|scope| scope.scope_key == "invite:quota_subject_domain:workspace:w1:qq.com")
      .unwrap();
    assert_eq!(high_risk.limit, 5);
  }

  #[test]
  fn owner_quota_subject_does_not_scale_by_workspace_count() {
    let facts = QuotaFacts {
      uses_owner_quota: true,
      owner_user_id: Some("owner-a".to_string()),
      ..quota("free", 3)
    };
    assert_eq!(quota_subject("w1", &facts), ("owner:owner-a".to_string(), 3));
    assert_eq!(plan_ceiling_7d(Deployment::Cloud, "free", 3).min(3 * 2), 6);
  }

  #[test]
  fn low_acceptance_activity_reduces_invite_limits() {
    let now = Utc.with_ymd_and_hms(2026, 7, 6, 0, 0, 0).single().unwrap();
    let input = RuntimeWorkspaceInviteQuotaInput {
      actor_user_id: "u1".to_string(),
      workspace_id: "w1".to_string(),
      request_id: None,
      target_count: 2,
      target_domains: vec![RuntimeQuotaTargetDomainInput {
        domain: "example.com".to_string(),
        count: 2,
      }],
      source: None,
    };
    let activity = InviteActivityFacts {
      actor_created_7d: 10,
      actor_accepted_7d: 0,
      ..Default::default()
    };

    let scopes = build_invite_scopes(
      Deployment::Cloud,
      &input,
      &user(now - Duration::days(60)),
      &workspace(now - Duration::days(60)),
      &quota("paid_team", 10),
      &activity,
      &invite_config(),
      now,
    )
    .unwrap();

    let day = scopes
      .iter()
      .find(|scope| scope.scope_key == "invite:user:u1" && scope.window_seconds == 86_400)
      .unwrap();
    assert_eq!(day.limit, 5);
  }

  #[test]
  fn invite_commit_usage_uses_domain_counts_for_domain_scopes() {
    let domain_usage = sum_domains(&[
      RuntimeQuotaTargetDomainInput {
        domain: "Example.com".to_string(),
        count: 2,
      },
      RuntimeQuotaTargetDomainInput {
        domain: "qq.com".to_string(),
        count: 1,
      },
    ]);

    assert_eq!(
      invite_commit_usage_for_scope("invite:user_domain:u1:example.com", 3, &domain_usage),
      2
    );
    assert_eq!(
      invite_commit_usage_for_scope("invite:quota_subject:workspace:w1", 3, &domain_usage),
      3
    );
  }

  #[test]
  fn high_confidence_abuse_selects_workspace_and_source_subjects() {
    let config = invite_config();
    let mut input = RuntimeWorkspaceInviteQuotaInput {
      actor_user_id: "u1".to_string(),
      workspace_id: "w1".to_string(),
      request_id: None,
      target_count: 30,
      target_domains: vec![RuntimeQuotaTargetDomainInput {
        domain: "qq.com".to_string(),
        count: 30,
      }],
      source: Some(RuntimeQuotaSourceInput {
        trusted: true,
        ip: Some("192.168.12.34".to_string()),
        country: Some("US".to_string()),
        asn: Some(13335),
        ray_id: Some("ray".to_string()),
      }),
    };

    let workspace_decision = high_confidence_invite_abuse(
      Deployment::Cloud,
      &input,
      &user(Utc.with_ymd_and_hms(2026, 7, 1, 0, 0, 0).single().unwrap()),
      &config,
    )
    .unwrap();
    assert_eq!(workspace_decision.action, "quarantine_workspace");
    assert_eq!(workspace_decision.subject_kind, "workspace");

    input.target_count = 12;
    input.target_domains[0].count = 12;
    let source_decision = high_confidence_invite_abuse(
      Deployment::Cloud,
      &input,
      &user(Utc.with_ymd_and_hms(2026, 7, 1, 0, 0, 0).single().unwrap()),
      &config,
    )
    .unwrap();
    assert_eq!(source_decision.action, "quarantine_source_cohort");
    assert_eq!(source_decision.subject_kind, "source_prefix_domain");
    assert!(
      source_decision
        .subject_key
        .starts_with("source_prefix_domain_sha256:v1:")
    );
  }

  #[test]
  fn source_cohort_action_requires_trusted_source() {
    let config = invite_config();
    let input = RuntimeWorkspaceInviteQuotaInput {
      actor_user_id: "u1".to_string(),
      workspace_id: "w1".to_string(),
      request_id: None,
      target_count: 12,
      target_domains: vec![RuntimeQuotaTargetDomainInput {
        domain: "qq.com".to_string(),
        count: 12,
      }],
      source: Some(RuntimeQuotaSourceInput {
        trusted: false,
        ip: Some("192.168.12.34".to_string()),
        country: Some("US".to_string()),
        asn: Some(13335),
        ray_id: Some("ray".to_string()),
      }),
    };

    let decision = high_confidence_invite_abuse(
      Deployment::Cloud,
      &input,
      &user(Utc.with_ymd_and_hms(2026, 7, 1, 0, 0, 0).single().unwrap()),
      &config,
    )
    .unwrap();
    assert_eq!(decision.action, "quarantine_actor");
    assert_eq!(decision.subject_kind, "actor_email");
  }

  // --- self-host ------------------------------------------------------------

  fn burst_input(target_count: i32, domain: &str) -> RuntimeWorkspaceInviteQuotaInput {
    RuntimeWorkspaceInviteQuotaInput {
      actor_user_id: "u1".to_string(),
      workspace_id: "w1".to_string(),
      request_id: None,
      target_count,
      target_domains: vec![RuntimeQuotaTargetDomainInput {
        domain: domain.to_string(),
        count: target_count,
      }],
      source: None,
    }
  }

  #[test]
  fn selfhost_lifts_cloud_invite_throttling_but_keeps_a_seat_ceiling() {
    let now = Utc.with_ymd_and_hms(2026, 7, 6, 0, 0, 0).single().unwrap();
    // qq.com 在 Cloud 侧属于高风险域名，且账号/workspace 都只有 1 小时。
    let input = burst_input(20, "qq.com");
    let actor = user(now - Duration::hours(1));
    let workspace = workspace(now - Duration::hours(1));
    let quota = quota("selfhost_free", 1000);

    let scopes = build_invite_scopes(
      Deployment::SelfHosted,
      &input,
      &actor,
      &workspace,
      &quota,
      &InviteActivityFacts::default(),
      &invite_config(),
      now,
    )
    .unwrap();

    // 周窗口不再被 plan_ceiling_7d 的免费档 10 卡住，而是走席位上界。
    let week = scopes
      .iter()
      .find(|scope| scope.scope_key == "invite:user:u1" && scope.window_seconds == 604_800)
      .unwrap();
    assert_eq!(week.limit, SELFHOST_INVITE_BURST_CEILING);

    // 同样的输入在 Cloud 下会因 <24h 新账号被一刀切归零。
    let cloud = build_invite_scopes(
      Deployment::Cloud,
      &input,
      &actor,
      &workspace,
      &quota,
      &InviteActivityFacts::default(),
      &invite_config(),
      now,
    )
    .unwrap();
    assert_eq!(cloud.len(), 1);
    assert_eq!(cloud[0].limit, 0);
  }

  #[test]
  fn selfhost_never_quarantines_invite_actors() {
    let now = Utc.with_ymd_and_hms(2026, 7, 6, 0, 0, 0).single().unwrap();
    let input = burst_input(30, "qq.com");

    assert!(
      high_confidence_invite_abuse(
        Deployment::SelfHosted,
        &input,
        &user(now - Duration::days(60)),
        &invite_config(),
      )
      .is_none()
    );
  }

  #[test]
  fn selfhost_still_rejects_disabled_or_unregistered_actors() {
    let now = Utc.with_ymd_and_hms(2026, 7, 6, 0, 0, 0).single().unwrap();
    let input = burst_input(1, "example.com");
    let quota = quota("selfhost_free", 1000);

    for actor in [
      ActorFacts {
        disabled: true,
        ..user(now - Duration::days(60))
      },
      ActorFacts {
        registered: false,
        ..user(now - Duration::days(60))
      },
    ] {
      let scopes = build_invite_scopes(
        Deployment::SelfHosted,
        &input,
        &actor,
        &workspace(now - Duration::days(60)),
        &quota,
        &InviteActivityFacts::default(),
        &invite_config(),
        now,
      )
      .unwrap();

      assert_eq!(scopes.len(), 1);
      assert_eq!(scopes[0].limit, 0);
    }
  }
}
