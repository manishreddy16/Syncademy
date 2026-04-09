import { useEffect, useState } from 'react';
import {
  createAssignment,
  createAssignmentOffline,
  getSchoolAssignments,
  submitAssignment,
  submitAssignmentOffline,
  getAssignmentSubmissions,
  getStudentSubmissions,
} from '../services/assignments';
import { getOnlineStatus, subscribeToOnlineStatus } from '../utils/onlineStatus';
import { isAdminUser } from '../utils/auth';
import FileSharingComponent from '../components/FileSharingComponent';

interface AssignmentsPageProps {
  user: { uid: string; role: string; schoolId: string; name: string; email: string };
}

const AssignmentsPage = ({ user }: AssignmentsPageProps) => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Admin form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Student submission states
  const [selectedAssignment, setSelectedAssignment] = useState<string>('');
  const [submissionContent, setSubmissionContent] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    const unsubscribe = subscribeToOnlineStatus(setIsOnline);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const schoolAssignments = await getSchoolAssignments(user.schoolId);
        setAssignments(schoolAssignments);

        if (!isAdminUser()) {
          const studentSubmissions = await getStudentSubmissions(user.uid);
          setSubmissions(studentSubmissions);
        }
      } catch (error) {
        console.error('Error loading assignments:', error);
        setFeedback({ type: 'error', message: 'Failed to load assignments' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user.schoolId, user.uid]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!title || !description || !dueDate) {
      setFeedback({ type: 'error', message: 'Please fill in all fields' });
      return;
    }

    setCreating(true);

    try {
      if (isOnline) {
        await createAssignment({
          title,
          description,
          dueDate: new Date(dueDate).getTime(),
          createdBy: user.uid,
          schoolId: user.schoolId,
        });

        setFeedback({ type: 'success', message: 'Assignment created successfully!' });
      } else {
        await createAssignmentOffline({
          title,
          description,
          dueDate: new Date(dueDate).getTime(),
          createdBy: user.uid,
          schoolId: user.schoolId,
        });

        setFeedback({ type: 'success', message: 'Assignment queued offline and will publish when online.' });
      }

      setTitle('');
      setDescription('');
      setDueDate('');

      // Reload assignments
      const schoolAssignments = await getSchoolAssignments(user.schoolId);
      setAssignments(schoolAssignments);
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to create assignment' });
    } finally {
      setCreating(false);
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!selectedAssignment || !submissionContent.trim()) {
      setFeedback({ type: 'error', message: 'Please select an assignment and provide content' });
      return;
    }

    setSubmitting(true);

    try {
      if (isOnline) {
        await submitAssignment(selectedAssignment, user.uid, submissionContent);
        setFeedback({ type: 'success', message: 'Assignment submitted successfully!' });
      } else {
        await submitAssignmentOffline(selectedAssignment, user.uid, submissionContent);
        setFeedback({ type: 'success', message: 'Assignment saved offline. Will submit when online.' });
      }

      setSubmissionContent('');
      setSelectedAssignment('');

      // Reload submissions
      const studentSubmissions = await getStudentSubmissions(user.uid);
      setSubmissions(studentSubmissions);
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to submit assignment' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border border-slate-800 bg-slate-900/90 p-8 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-slate-500">📝 Assignments</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Manage coursework and submissions</h2>
          </div>
          <div className="flex gap-4">
            <div className="rounded-3xl bg-slate-950/80 px-6 py-4 text-slate-200 shadow-soft">
              <p className="text-sm text-slate-400">Active</p>
              <p className="mt-2 text-2xl font-semibold text-white">{assignments.length}</p>
            </div>
            <div
              className={`rounded-3xl px-6 py-4 shadow-soft ${
                isOnline
                  ? 'bg-green-950/40 border border-green-700'
                  : 'bg-red-950/40 border border-red-700'
              }`}
            >
              <p className="text-sm text-slate-400">Status</p>
              <p className={`mt-2 text-2xl font-semibold ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                {isOnline ? '🟢 Online' : '🔴 Offline'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isAdminUser() && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-6">
            <h3 className="text-xl font-semibold text-white">📋 Create Assignment</h3>
            <form className="mt-5 space-y-4" onSubmit={handleCreateAssignment}>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Due Date</label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-white font-semibold hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Publish Assignment'}
              </button>

              {!isOnline && (
                <p className="text-sm text-yellow-300">⚠️ Assignment will be queued offline and synced when online.</p>
              )}

              {feedback.message && (
                <div
                  className={`p-4 rounded-2xl text-sm ${
                    feedback.type === 'success'
                      ? 'bg-green-900/20 text-green-200 border border-green-700'
                      : 'bg-red-900/20 text-red-200 border border-red-700'
                  }`}
                >
                  {feedback.message}
                </div>
              )}
            </form>
          </div>

          <div className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-6">
            <h3 className="text-xl font-semibold text-white">📊 Current Assignments</h3>
            {loading ? (
              <p className="text-slate-400 mt-4">Loading...</p>
            ) : assignments.length === 0 ? (
              <p className="text-slate-400 mt-4">No assignments yet. Create one to get started.</p>
            ) : (
              <div className="mt-5 space-y-4 max-h-96 overflow-y-auto">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                    <h4 className="font-semibold text-white">{assignment.title}</h4>
                    <p className="mt-2 text-sm text-slate-400 line-clamp-2">{assignment.description}</p>
                    <p className="mt-3 text-xs text-slate-500">
                      Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!isAdminUser() && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-6">
            <h3 className="text-xl font-semibold text-white">📖 Available Assignments</h3>
            {loading ? (
              <p className="text-slate-400 mt-4">Loading...</p>
            ) : assignments.length === 0 ? (
              <p className="text-slate-400 mt-4">No assignments available yet.</p>
            ) : (
              <div className="mt-5 space-y-3 max-h-96 overflow-y-auto">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                      selectedAssignment === assignment.id
                        ? 'border-indigo-500 bg-indigo-950/20'
                        : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                    }`}
                    onClick={() => setSelectedAssignment(assignment.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{assignment.title}</h4>
                        <p className="mt-1 text-sm text-slate-400 line-clamp-2">{assignment.description}</p>
                        <p className="mt-2 text-xs text-slate-500">Due: {new Date(assignment.dueDate).toLocaleDateString()}</p>
                      </div>
                      <input
                        type="radio"
                        checked={selectedAssignment === assignment.id}
                        onChange={() => setSelectedAssignment(assignment.id)}
                        className="ml-4"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-6">
            <h3 className="text-xl font-semibold text-white">📤 Submit Assignment</h3>
            <form className="mt-5 space-y-4" onSubmit={handleSubmitAssignment}>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Your Answer/Content</label>
                <textarea
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  required
                  rows={6}
                  placeholder="Write or paste your answer here..."
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !selectedAssignment}
                className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-white font-semibold hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Assignment'}
              </button>

              {!isOnline && (
                <p className="text-sm text-yellow-300">⚠️ Submission will be saved offline and synced when online</p>
              )}

              {feedback.message && (
                <div
                  className={`p-4 rounded-2xl text-sm ${
                    feedback.type === 'success'
                      ? 'bg-green-900/20 text-green-200 border border-green-700'
                      : 'bg-red-900/20 text-red-200 border border-red-700'
                  }`}
                >
                  {feedback.message}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {!isAdminUser() && submissions.length > 0 && (
        <div className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">📋 Your Submissions</h3>
          <div className="space-y-3">
            {submissions.map((submission) => (
              <div key={submission.id} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-white">Assignment {submission.assignmentId}</p>
                    <p className="text-slate-400 text-sm mt-1">
                      Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      submission.status === 'graded'
                        ? 'bg-green-900 text-green-200'
                        : submission.status === 'submitted'
                        ? 'bg-blue-900 text-blue-200'
                        : 'bg-yellow-900 text-yellow-200'
                    }`}
                  >
                    {submission.status === 'graded' ? `✓ Graded: ${submission.grade}` : submission.status === 'submitted' ? 'Submitted' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default AssignmentsPage;
