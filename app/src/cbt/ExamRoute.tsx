import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useStore, useSignInNudge } from '../store';
import { defaultAttemptStore } from './attemptStore';
import { ExamFlow } from './ExamFlow';
import { useExamData } from './loader';
import './cbt.css';

/** `/exam/:paperId`: full-screen runner, no app chrome. */
export function ExamRoute() {
  const { paperId = '' } = useParams();
  const { data, loading, error } = useExamData(paperId);
  const store = useStore();
  const nav = useNavigate();
  const { nudge } = useSignInNudge();
  const [name, setName] = useState<string | undefined>();
  const attempts = useMemo(() => defaultAttemptStore(), []);
  useEffect(() => {
    let live = true;
    store.getProfile().then(
      (p) => live && setName(p?.displayName || 'Candidate'),
      () => live && setName('Candidate'),
    );
    return () => {
      live = false;
    };
  }, [store]);

  if (error) {
    return (
      <div className="cbt-root cbt-center">
        <div className="cbt-card">
          <p>We could not open this paper. Check your connection, or pick another paper.</p>
          <Link className="cbt-btn" to="/mocks">Back to mock tests</Link>
        </div>
      </div>
    );
  }
  if (loading || !data || name === undefined) return <div className="cbt-root cbt-center" role="status">Loading your paper…</div>;
  return (
    <ExamFlow
      model={data.model}
      loadAnswers={data.loadAnswers}
      attempts={attempts}
      store={store}
      candidateName={name}
      onNudge={() => nudge('first_session')}
      onFinished={(id) => nav(`/exam/${data.model.paperId}/result/${id}`, { replace: true })}
    />
  );
}
