import { useEffect, useState } from 'react';
import api, { detailText } from '../../api/client';
import Pagination, { usePager } from '../../components/Pagination';
import ResultDetailModal from '../../components/ResultDetailModal';

export default function Results() {
  const [results, setResults] = useState([]);

  const pg = usePager(results);
  const [detail, setDetail] = useState(null);
  const [answers, setAnswers] = useState(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/results/my-results').then((r) => setResults(r.data));
  }, []);

  const view = async (attemptId) => {
    setError('');
    try {
      const { data } = await api.get(`/results/my-results/${attemptId}`);
      setAnswers(null);
      setDetail(data);
    } catch (err) {
      setError(detailText(err, 'Could not load result details'));
    }
  };

  const viewFull = async () => {
    setLoadingFull(true);
    setError('');
    try {
      const { data } = await api.get(
        `/results/my-results/${detail.attempt_id}/answers`
      );
      setAnswers(data);
    } catch (err) {
      setError(detailText(err, 'Could not load answer details'));
    } finally {
      setLoadingFull(false);
    }
  };

  const close = () => {
    setDetail(null);
    setAnswers(null);
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">My Results</h1>

      {error && (
        <p className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
      )}

      <div className="overflow-x-auto">
      <table className="w-full bg-white rounded shadow text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-3">Exam</th><th>Attempt</th><th>Status</th>
            <th>Total marks</th><th>Obtained</th><th>%</th><th>Result</th><th></th>
          </tr>
        </thead>
        <tbody>
          {pg.items.map((r) => (
            <tr key={r.attempt_id} onClick={() => view(r.attempt_id)}
              className="border-b cursor-pointer hover:bg-gray-50">
              <td className="p-3">{r.exam_name}</td>
              <td>{r.attempt_no}</td>
              <td className="capitalize">{r.status}</td>
              <td>{r.maximum_marks ?? '-'}</td>
              <td>{r.total_marks ?? '-'}</td>
              <td>{r.percentage ?? '-'}</td>
              <td>
                <span className={
                  r.pass_fail === 'PASS' ? 'text-green-600 font-medium'
                    : r.pass_fail === 'FAIL' ? 'text-red-600'
                    : 'text-amber-600'
                }>
                  {r.pass_fail ? r.pass_fail.toLowerCase() : 'pending'}
                </span>
              </td>
              <td>
                <button onClick={(e) => { e.stopPropagation(); view(r.attempt_id); }}
                  className="text-blue-600 hover:underline">Details</button>
              </td>
            </tr>
          ))}
          {results.length === 0 && (
            <tr><td colSpan={8} className="p-4 text-gray-400">No results yet</td></tr>
          )}
        </tbody>
      </table>
      </div>
      <Pagination page={pg.page} pages={pg.pages} onChange={pg.setPage} />

      {detail && (
        <ResultDetailModal
          detail={detail}
          answers={answers}
          loadingFull={loadingFull}
          onViewFull={viewFull}
          onClose={close}
        />
      )}
    </div>
  );
}
