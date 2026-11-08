import { useNavigate } from 'react-router';
import { Landing } from '../landing/Landing';
import { useStartGuest } from '../store/StoreProvider';

/** What `/` shows to visitors who are neither signed in nor guests. */
export function PublicEntry() {
  const startGuest = useStartGuest();
  const navigate = useNavigate();
  return <Landing onStartGuest={() => void startGuest().then(() => navigate('/', { replace: true }))} />;
}
