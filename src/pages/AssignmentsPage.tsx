import { useEffect, useState } from 'react';
import {
  createAssignment,
  createAssignmentOffline,
  getSchoolAssignments,
  submitAssignment,
  submitAssignmentOffline,
  getAssignmentSubmissions,
  getStudentSubmissions,
  hasStudentSubmitted,
  type Assignment,
  type Question,
} from '../services/assignments';
import { getOnlineStatus, subscribeToOnlineStatus } from '../utils/onlineStatus';
import { isAdminUser } from '../utils/auth';
import FileSharingComponent from '../components/FileSharingComponent';

interface AssignmentsPageProps {
  user: { uid: string; role: string; schoolId: string; name: string; email: string };
}

const AssignmentsPage = ({ user }: AssignmentsPageProps) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Admin form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignmentType, setAssignmentType] = useState<'assignment' | 'quiz'>('assignment');
  const [questions, setQuestions] = useState<Question[]>([]);

  // Student submission states
  const [selectedAssignment, setSelectedAssignment] = useState<string>('');
  const [submissionContent, setSubmissionContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    const unsubscribe = subscribeToOnlineStatus(setIsOnline);
    return unsubscribe;
  }, []);

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

  useEffect(() => {
    loadData();

    const handleSyncComplete = () => {
      loadData();
    };

    window.addEventListener('syncademy:sync-complete', handleSyncComplete);
    return () => window.removeEventListener('syncademy:sync-complete', handleSyncComplete);
  }, [user.schoolId, user.uid]);

  // Question management functions
  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: '',
      type: 'multiple-choice',
      options: ['', ''],
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q =>
      q.id === questionId ? { ...q, ...updates } : q
    ));
  };

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q =>
      q.id === questionId
        ? { ...q, options: [...(q.options || []), ''] }
        : q
    ));
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(questions.map(q =>
      q.id === questionId
        ? { ...q, options: (q.options || []).filter((_, i) => i !== optionIndex) }
        : q
    ));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q =>
      q.id === questionId
        ? {
            ...q,
            options: (q.options || []).map((opt, i) => i === optionIndex ? value : opt)
          }
        : q
    ));
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!title || !description || !dueDate) {
      setFeedback({ type: 'error', message: 'Please fill in all required fields' });
      return;
    }

    if (assignmentType === 'quiz' && questions.length === 0) {
      setFeedback({ type: 'error', message: 'Please add at least one question for the quiz' });
      return;
    }

    // Validate questions
    if (assignmentType === 'quiz') {
      for (const question of questions) {
        if (!question.text.trim()) {
          setFeedback({ type: 'error', message: 'All questions must have text' });
          return;
        }
        if (question.type === 'multiple-choice' && (!question.options || question.options.length < 2)) {
          setFeedback({ type: 'error', message: 'Multiple choice questions must have at least 2 options' });
          return;
        }
      }
    }

    setCreating(true);

    try {
      const assignmentData = {
        title,
        description,
        dueDate: new Date(dueDate).getTime(),
        createdBy: user.uid,
        schoolId: user.schoolId,
        type: assignmentType,
        questions: assignmentType === 'quiz' ? questions : undefined,
      };

      if (isOnline) {
        await createAssignment(assignmentData);
        setFeedback({ type: 'success', message: 'Assignment created successfully!' });
      } else {
        await createAssignmentOffline(assignmentData);
        setFeedback({ type: 'success', message: 'Assignment saved offline. Will sync when online.' });
      }

      // Reset form
      setTitle('');
      setDescription('');
      setDueDate('');
      setAssignmentType('assignment');
      setQuestions([]);

      // Reload data
      loadData();
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to create assignment' });
    } finally {
      setCreating(false);
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!selectedAssignment) {
      setFeedback({ type: 'error', message: 'Please select an assignment' });
      return;
    }

    const assignment = assignments.find(a => a.id === selectedAssignment);
    if (!assignment) {
      setFeedback({ type: 'error', message: 'Assignment not found' });
      return;
    }

    // Check if already submitted
    const alreadySubmitted = await hasStudentSubmitted(selectedAssignment, user.uid);
    if (alreadySubmitted) {
      setFeedback({ type: 'error', message: 'You have already submitted this assignment' });
      return;
    }

    // Validate submission based on assignment type
    if (assignment.type === 'quiz') {
      if (!assignment.questions || assignment.questions.length === 0) {
        setFeedback({ type: 'error', message: 'This quiz has no questions' });
        return;
      }

      // Check if all questions are answered
      const unansweredQuestions = assignment.questions.filter(q => !answers[q.id]?.trim());
      if (unansweredQuestions.length > 0) {
        setFeedback({ type: 'error', message: 'Please answer all questions' });
        return;
      }
    } else {
      // Regular assignment validation
      if (!submissionContent.trim() && !file) {
        setFeedback({ type: 'error', message: 'Please provide text content or upload a file' });
        return;
      }
    }

    setSubmitting(true);

    try {
      if (isOnline) {
        await submitAssignment(
          selectedAssignment,
          user.uid,
          assignment.type === 'quiz' ? null : submissionContent || null,
          assignment.type === 'quiz' ? null : file,
          user.schoolId,
          assignment.type === 'quiz' ? answers : undefined
        );
        setFeedback({ type: 'success', message: 'Assignment submitted successfully!' });
      } else {
        await submitAssignmentOffline(
          selectedAssignment,
          user.uid,
          assignment.type === 'quiz' ? null : submissionContent || null,
          assignment.type === 'quiz' ? null : file,
          user.schoolId,
          assignment.type === 'quiz' ? answers : undefined
        );
        setFeedback({ type: 'success', message: 'Assignment saved offline. Will submit when online.' });
      }

      setSubmissionContent('');
      setSelectedAssignment('');
      setFile(null);
      setAnswers({});

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
            <h3 className="text-xl font-semibold text-white">📋 Create Assignment/Quiz</h3>
            <form className="mt-5 space-y-4" onSubmit={handleCreateAssignment}>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
                <select
                  value={assignmentType}
                  onChange={(e) => setAssignmentType(e.target.value as 'assignment' | 'quiz')}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500"
                >
                  <option value="assignment">Assignment</option>
                  <option value="quiz">Quiz</option>
                </select>
              </div>

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
                  rows={3}
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

              {assignmentType === 'quiz' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-medium text-white">Questions</h4>
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="px-3 py-1 rounded-lg bg-green-600 text-white text-sm hover:bg-green-500"
                    >
                      + Add Question
                    </button>
                  </div>

                  {questions.map((question, index) => (
                    <div key={question.id} className="p-4 bg-slate-800/50 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">Question {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeQuestion(question.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Question Text</label>
                        <input
                          type="text"
                          value={question.text}
                          onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                          placeholder="Enter your question"
                          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Question Type</label>
                        <select
                          value={question.type}
                          onChange={(e) => updateQuestion(question.id, { type: e.target.value as Question['type'] })}
                          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:border-indigo-500"
                        >
                          <option value="multiple-choice">Multiple Choice</option>
                          <option value="text">Text Answer</option>
                          <option value="true-false">True/False</option>
                        </select>
                      </div>

                      {question.type === 'multiple-choice' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-300">Options</span>
                            <button
                              type="button"
                              onClick={() => addOption(question.id)}
                              className="px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-500"
                            >
                              + Option
                            </button>
                          </div>
                          {question.options?.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                                placeholder={`Option ${optionIndex + 1}`}
                                className="flex-1 rounded border border-slate-600 bg-slate-900 px-3 py-1 text-white focus:border-indigo-500"
                              />
                              {question.options!.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeOption(question.id, optionIndex)}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {questions.length === 0 && (
                    <p className="text-slate-400 text-center py-4">No questions added yet. Click "Add Question" to start building your quiz.</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-white font-semibold hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : `Publish ${assignmentType === 'quiz' ? 'Quiz' : 'Assignment'}`}
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
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-white">{assignment.title}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            assignment.type === 'quiz'
                              ? 'bg-purple-900 text-purple-200'
                              : 'bg-blue-900 text-blue-200'
                          }`}>
                            {assignment.type === 'quiz' ? 'Quiz' : 'Assignment'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-400 line-clamp-2">{assignment.description}</p>
                        <p className="mt-2 text-xs text-slate-500">Due: {new Date(assignment.dueDate).toLocaleDateString()}</p>
                        {assignment.type === 'quiz' && assignment.questions && (
                          <p className="mt-1 text-xs text-slate-400">{assignment.questions.length} questions</p>
                        )}
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
            {selectedAssignment && (
              <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-300">
                  Selected: <span className="text-white font-medium">
                    {assignments.find(a => a.id === selectedAssignment)?.title}
                  </span>
                </p>
              </div>
            )}

            <form className="mt-5 space-y-4" onSubmit={handleSubmitAssignment}>
              {selectedAssignment && (() => {
                const assignment = assignments.find(a => a.id === selectedAssignment);
                if (assignment?.type === 'quiz' && assignment.questions) {
                  return (
                    <div className="space-y-6">
                      <h4 className="text-lg font-medium text-white">Answer the Questions</h4>
                      {assignment.questions.map((question, index) => (
                        <div key={question.id} className="p-4 bg-slate-800/30 rounded-lg">
                          <p className="text-white font-medium mb-3">
                            {index + 1}. {question.text}
                          </p>

                          {question.type === 'multiple-choice' && question.options && (
                            <div className="space-y-2">
                              {question.options.map((option, optionIndex) => (
                                <label key={optionIndex} className="flex items-center gap-3 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={question.id}
                                    value={option}
                                    checked={answers[question.id] === option}
                                    onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                                    className="text-indigo-500 focus:ring-indigo-500"
                                  />
                                  <span className="text-slate-300">{option}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {question.type === 'text' && (
                            <textarea
                              value={answers[question.id] || ''}
                              onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                              placeholder="Enter your answer..."
                              rows={3}
                              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:border-indigo-500"
                            />
                          )}

                          {question.type === 'true-false' && (
                            <div className="space-y-2">
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="radio"
                                  name={question.id}
                                  value="true"
                                  checked={answers[question.id] === 'true'}
                                  onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                                  className="text-indigo-500 focus:ring-indigo-500"
                                />
                                <span className="text-slate-300">True</span>
                              </label>
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="radio"
                                  name={question.id}
                                  value="false"
                                  checked={answers[question.id] === 'false'}
                                  onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                                  className="text-indigo-500 focus:ring-indigo-500"
                                />
                                <span className="text-slate-300">False</span>
                              </label>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                } else {
                  return (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Your Answer/Content</label>
                        <textarea
                          value={submissionContent}
                          onChange={(e) => setSubmissionContent(e.target.value)}
                          rows={6}
                          placeholder="Write or paste your answer here..."
                          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Upload PDF (optional)</label>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                          className="w-full text-white"
                        />
                        {file && <p className="mt-2 text-sm text-slate-400">Selected file: {file.name}</p>}
                      </div>
                    </>
                  );
                }
              })()}

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
                      Submitted: {new Date(submission.submittedAt).toLocaleString()}
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
