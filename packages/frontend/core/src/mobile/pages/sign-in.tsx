// oxlint-disable-next-line no-restricted-imports
import { useNavigate, useSearchParams } from 'react-router-dom';

import { MobileSignInPanel } from '../components/sign-in';

export const Component = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect_uri') ?? undefined;

  return (
    <MobileSignInPanel
      onClose={() => navigate(redirectUrl ?? '/')}
      redirectUrl={redirectUrl}
    />
  );
};
