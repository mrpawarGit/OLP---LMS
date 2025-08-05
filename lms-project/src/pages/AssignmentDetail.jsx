import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  ProgressBar,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import LoadingSpinner from "../components/common/LoadingSpinner";

// Helper function to parse question content into structured sections
const parseQuestionContent = (questionText) => {
  const sections = {};
  let content = questionText;

  // Extract title if present
  const titleMatch = content.match(/^Title\s*:\s*(.+?)(?:\n|$)/i);
  if (titleMatch) {
    sections.title = titleMatch[1].trim();
    content = content.replace(titleMatch[0], "");
  }

  // Extract problem statement
  const problemMatch = content.match(
    /\*\*Problem Statement:\s*\*\*\s*([\s\S]*?)(?=Submission Guidelines:|$)/i
  );
  if (problemMatch) {
    sections.problemStatement = problemMatch[1].trim();
    content = content.replace(problemMatch[0], "");
  }

  // Extract submission guidelines
  const submissionMatch = content.match(
    /Submission Guidelines:\s*([\s\S]*?)$/i
  );
  if (submissionMatch) {
    sections.submissionGuidelines = submissionMatch[1].trim();
    content = content.replace(submissionMatch[0], "");
  }

  // If no structured content found, treat as plain text
  if (
    !sections.title &&
    !sections.problemStatement &&
    !sections.submissionGuidelines
  ) {
    sections.main = questionText;
  }

  return sections;
};

export default function AssignmentDetail() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [gitSubmissions, setGitSubmissions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false); // ✅ NEW: Saving indicator

  // ✅ NEW: Refs for debouncing
  const saveTimeoutRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    fetchAssignment();
  }, []);

  useEffect(() => {
    if (!assignment) return;

    const deadlineTime = new Date(assignment.deadline).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const diff = deadlineTime - now;
      setTimeLeft(diff > 0 ? diff : 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [assignment]);

  // ✅ NEW: Auto-save function with debouncing
  const saveProgress = useCallback(async () => {
    if (!assignment || isSubmitted || timeLeft <= 0 || isSaving) return;

    setIsSaving(true);
    try {
      await setDoc(
        doc(db, "assignments", id, "submissions", currentUser.uid),
        {
          answers,
          gitSubmissions,
          lastSaved: serverTimestamp(),
          isSubmitted: false,
          totalQuestions: assignment.questions.length,
          answeredQuestions: answers.filter((a) => a && a.trim()).length,
        },
        { merge: true }
      );
      setLastSaved(new Date());
      setShowSaveToast(true);
    } catch (error) {
      console.error("Error auto-saving:", error);
    } finally {
      setIsSaving(false);
    }
  }, [
    assignment,
    isSubmitted,
    timeLeft,
    answers,
    gitSubmissions,
    currentUser.uid,
    id,
    isSaving,
  ]);

  // ✅ NEW: Debounced auto-save effect - saves 1 second after user stops typing
  useEffect(() => {
    // Skip saving on initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout to save after user stops typing
    saveTimeoutRef.current = setTimeout(() => {
      saveProgress();
    }, 1000); // ✅ Save 1 second after user stops typing

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [answers, gitSubmissions, saveProgress]);

  // ✅ NEW: Emergency backup save every 30 seconds (fallback)
  useEffect(() => {
    if (!assignment || isSubmitted || timeLeft <= 0) return;

    const emergencyBackup = setInterval(() => {
      saveProgress();
    }, 30000); // Backup save every 30 seconds

    return () => clearInterval(emergencyBackup);
  }, [assignment, isSubmitted, timeLeft, saveProgress]);

  const fetchAssignment = async () => {
    try {
      // Fetch assignment
      const assignmentDoc = await getDoc(doc(db, "assignments", id));
      if (!assignmentDoc.exists()) {
        navigate("/assignments");
        return;
      }

      const assignmentData = assignmentDoc.data();
      setAssignment(assignmentData);

      // Initialize answers and git submissions arrays
      const questionsLength = assignmentData.questions.length;
      setAnswers(new Array(questionsLength).fill(""));
      setGitSubmissions(new Array(questionsLength).fill(""));

      // Check for existing submission
      const submissionDoc = await getDoc(
        doc(db, "assignments", id, "submissions", currentUser.uid)
      );

      if (submissionDoc.exists()) {
        const submissionData = submissionDoc.data();
        setAnswers(
          submissionData.answers || new Array(questionsLength).fill("")
        );
        setGitSubmissions(
          submissionData.gitSubmissions || new Array(questionsLength).fill("")
        );
        setIsSubmitted(submissionData.isSubmitted || false);
        if (submissionData.lastSaved) {
          setLastSaved(new Date(submissionData.lastSaved.seconds * 1000));
        }
      }
    } catch (error) {
      console.error("Error fetching assignment:", error);
      navigate("/assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (value) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = value;
    setAnswers(newAnswers);
  };

  const handleGitSubmissionChange = (value) => {
    const newGitSubmissions = [...gitSubmissions];
    newGitSubmissions[currentIndex] = value;
    setGitSubmissions(newGitSubmissions);
  };

  const handleSubmit = async () => {
    // Check if all questions are answered
    const unansweredQuestions = answers.filter(
      (answer) => !answer || !answer.trim()
    ).length;
    if (unansweredQuestions > 0) {
      const confirmSubmit = window.confirm(
        `You have ${unansweredQuestions} unanswered questions. Are you sure you want to submit?`
      );
      if (!confirmSubmit) return;
    }

    setSubmitLoading(true);
    try {
      await setDoc(doc(db, "assignments", id, "submissions", currentUser.uid), {
        answers,
        gitSubmissions,
        submittedAt: serverTimestamp(),
        isSubmitted: true,
        totalQuestions: assignment.questions.length,
        answeredQuestions: answers.filter((a) => a && a.trim()).length,
        studentId: currentUser.uid,
        studentEmail: currentUser.email,
      });

      setIsSubmitted(true);
      alert("🎉 Assignment submitted successfully!");
      navigate("/assignments");
    } catch (error) {
      console.error("Error submitting assignment:", error);
      alert("Failed to submit assignment. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatTimeLeft = (ms) => {
    if (ms <= 0) return "Time's up!";

    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const getAnsweredCount = () => {
    return answers.filter((answer) => answer && answer.trim()).length;
  };

  const getSubmissionCount = () => {
    return gitSubmissions.filter(
      (submission) => submission && submission.trim()
    ).length;
  };

  if (loading) {
    return <LoadingSpinner message="Loading assignment..." />;
  }

  if (!assignment) return null;

  const currentQuestion = assignment.questions[currentIndex];
  const totalQuestions = assignment.questions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;
  const canSubmit = timeLeft > 0 && !isSubmitted;
  const answeredCount = getAnsweredCount();
  const submissionCount = getSubmissionCount();

  return (
    <Container className="py-4">
      <Row>
        <Col lg={10} className="mx-auto">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="text-primary fw-bold">{assignment.title}</h2>
            <Button
              variant="outline-secondary"
              onClick={() => navigate("/assignments")}
            >
              ← Back to Assignments
            </Button>
          </div>

          {assignment.description && (
            <Alert variant="info" className="mb-4">
              <strong>📋 Assignment Description:</strong>{" "}
              {assignment.description}
            </Alert>
          )}

          {/* Timer */}
          <Alert
            variant={
              timeLeft > 3600000 ? "info" : timeLeft > 0 ? "warning" : "danger"
            }
            className="mb-4"
          >
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-bold">
                ⏰{" "}
                {timeLeft > 0
                  ? `Time remaining: ${formatTimeLeft(timeLeft)}`
                  : "Deadline passed"}
              </span>
              <span>
                📅 Due: {new Date(assignment.deadline).toLocaleString()}
              </span>
            </div>
          </Alert>

          {/* ✅ UPDATED: Progress and Stats with saving indicator */}
          <Card className="mb-4 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">
                  Question {currentIndex + 1} of {totalQuestions}
                </h5>
                <div className="d-flex gap-3 align-items-center">
                  <span className="badge bg-success fs-6">
                    ✅ {answeredCount}/{totalQuestions} answered
                  </span>
                  <span className="badge bg-info fs-6">
                    📂 {submissionCount}/{totalQuestions} submissions
                  </span>
                  <span className="badge bg-primary fs-6">
                    {Math.round(progress)}% Complete
                  </span>

                  {/* ✅ NEW: Real-time saving indicator */}
                  {isSaving && (
                    <span className="badge bg-warning fs-6">
                      <span
                        className="spinner-border spinner-border-sm me-1"
                        style={{ width: "0.8rem", height: "0.8rem" }}
                      />
                      Saving...
                    </span>
                  )}
                </div>
              </div>
              <ProgressBar
                now={progress}
                variant="primary"
                className="mb-2"
                style={{ height: "8px" }}
              />

              {/* ✅ UPDATED: Enhanced save status display */}
              <div className="d-flex justify-content-between align-items-center">
                {lastSaved && !isSaving && (
                  <small className="text-muted">
                    💾 Last saved: {lastSaved.toLocaleTimeString()}
                  </small>
                )}
                {!lastSaved && !isSaving && (
                  <small className="text-muted">
                    ✨ Auto-save enabled - saves as you type
                  </small>
                )}
                {isSaving && (
                  <small className="text-warning">
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      style={{ width: "0.7rem", height: "0.7rem" }}
                    />
                    Saving changes...
                  </small>
                )}

                {/* ✅ NEW: Save status indicator */}
                <div className="d-flex align-items-center gap-2">
                  {isSaving ? (
                    <small className="text-warning fw-bold">💾 Saving...</small>
                  ) : lastSaved ? (
                    <small className="text-success fw-bold">
                      ✓ All changes saved
                    </small>
                  ) : (
                    <small className="text-info">
                      💡 Start typing to auto-save
                    </small>
                  )}
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Question Navigation Pills */}
          <Card className="mb-4">
            <Card.Body className="py-3">
              <div className="d-flex flex-wrap gap-2">
                <span className="me-3 fw-bold text-secondary">
                  Quick Navigation:
                </span>
                {assignment.questions.map((_, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant={
                      index === currentIndex
                        ? "primary"
                        : answers[index] && answers[index].trim()
                        ? "success"
                        : "outline-secondary"
                    }
                    onClick={() => setCurrentIndex(index)}
                    className="position-relative"
                  >
                    Q{index + 1}
                    {gitSubmissions[index] && gitSubmissions[index].trim() && (
                      <span className="position-absolute top-0 start-100 translate-middle badge bg-info rounded-pill">
                        📂
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </Card.Body>
          </Card>

          {/* Enhanced Question Card */}
          <Card className="mb-4 shadow-sm border-primary">
            <Card.Header className="bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">
                  <span className="badge bg-light text-primary me-2">
                    {currentIndex + 1}
                  </span>
                  Question {currentIndex + 1} of {totalQuestions}
                </h4>
                <div className="d-flex gap-2">
                  {answers[currentIndex] && answers[currentIndex].trim() && (
                    <span className="badge bg-success fs-6">✓ Answered</span>
                  )}
                  {gitSubmissions[currentIndex] &&
                    gitSubmissions[currentIndex].trim() && (
                      <span className="badge bg-info fs-6">
                        📂 Code Submitted
                      </span>
                    )}
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-4">
              {/* Enhanced Question Content */}
              {(() => {
                const sections = parseQuestionContent(currentQuestion.prompt);

                return (
                  <div className="question-content">
                    {/* Title Section */}
                    {sections.title && (
                      <div className="mb-4">
                        <div className="d-flex align-items-center mb-3">
                          <span className="badge bg-secondary me-2 fs-6">
                            📝
                          </span>
                          <h5 className="mb-0 text-secondary fw-bold">TITLE</h5>
                        </div>
                        <div className="bg-light p-4 rounded border-start border-4 border-primary">
                          <h4 className="text-dark fw-bold mb-0">
                            {sections.title}
                          </h4>
                        </div>
                      </div>
                    )}

                    {/* Problem Statement Section */}
                    {sections.problemStatement && (
                      <div className="mb-4">
                        <div className="d-flex align-items-center mb-3">
                          <span className="badge bg-warning me-2 fs-6">🎯</span>
                          <h5 className="mb-0 text-warning fw-bold">
                            PROBLEM STATEMENT
                          </h5>
                        </div>
                        <div className="bg-warning bg-opacity-10 p-4 rounded border border-warning">
                          <div
                            style={{
                              whiteSpace: "pre-line",
                              lineHeight: "1.8",
                              fontSize: "15px",
                            }}
                          >
                            {sections.problemStatement
                              .split("\n")
                              .map((line, idx) => {
                                // Check if line contains example output (numbers pattern)
                                if (line.match(/^\s*[\d\s]+$/)) {
                                  return (
                                    <div
                                      key={idx}
                                      className="bg-dark text-light p-3 rounded my-3 font-monospace fs-6"
                                    >
                                      {line}
                                    </div>
                                  );
                                }
                                // Check if line mentions "output" or "Therefore"
                                if (
                                  line.toLowerCase().includes("output") ||
                                  line.toLowerCase().includes("therefore")
                                ) {
                                  return (
                                    <div
                                      key={idx}
                                      className="fw-bold text-primary mb-2"
                                    >
                                      {line}
                                    </div>
                                  );
                                }
                                return (
                                  <div key={idx} className="mb-2">
                                    {line}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Submission Guidelines Section */}
                    {sections.submissionGuidelines && (
                      <div className="mb-4">
                        <div className="d-flex align-items-center mb-3">
                          <span className="badge bg-success me-2 fs-6">📋</span>
                          <h5 className="mb-0 text-success fw-bold">
                            SUBMISSION GUIDELINES
                          </h5>
                        </div>
                        <div className="bg-success bg-opacity-10 p-4 rounded border border-success">
                          <div className="d-flex align-items-start">
                            <span className="me-3 fs-5">💡</span>
                            <div
                              style={{
                                whiteSpace: "pre-line",
                                fontSize: "15px",
                                lineHeight: "1.6",
                              }}
                            >
                              {sections.submissionGuidelines}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Plain question content if no structure found */}
                    {sections.main && (
                      <div className="mb-4">
                        <div className="bg-light p-4 rounded border-start border-4 border-primary">
                          <div
                            style={{
                              whiteSpace: "pre-line",
                              lineHeight: "1.8",
                              fontSize: "15px",
                            }}
                          >
                            {sections.main}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Answer Section */}
              <div className="mt-5 pt-4 border-top">
                <Form.Group className="mb-4">
                  <Form.Label className="d-flex align-items-center mb-3">
                    <span className="badge bg-primary me-3 fs-6">✏️</span>
                    <h5 className="mb-0 fw-bold text-primary">Your Answer</h5>
                    {/* ✅ NEW: Typing indicator */}
                    {isSaving && (
                      <small className="text-warning ms-3">
                        <span
                          className="spinner-border spinner-border-sm me-1"
                          style={{ width: "0.6rem", height: "0.6rem" }}
                        />
                        Saving as you type...
                      </small>
                    )}
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={10}
                    value={answers[currentIndex] || ""}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder="Write your detailed answer here... Be specific and explain your approach."
                    disabled={!canSubmit}
                    className="border-2 border-primary"
                    style={{ fontSize: "14px", lineHeight: "1.6" }}
                  />
                  <div className="d-flex justify-content-between mt-2">
                    <small className="text-muted">
                      {answers[currentIndex] ? answers[currentIndex].length : 0}{" "}
                      characters
                    </small>
                    {answers[currentIndex] &&
                      answers[currentIndex].length > 100 && (
                        <small className="text-success fw-bold">
                          ✓ Good detailed answer!
                        </small>
                      )}
                  </div>
                </Form.Group>

                {/* Enhanced Code Submission Section */}
                <Form.Group className="mb-4">
                  <Form.Label className="d-flex align-items-center mb-3">
                    <span className="badge bg-info me-3 fs-6">💻</span>
                    <h5 className="mb-0 fw-bold text-info">
                      Code / Repository Submission
                    </h5>
                    <small className="text-muted ms-3">
                      - Optional for this question
                    </small>
                    {/* ✅ NEW: Code typing indicator */}
                    {isSaving && gitSubmissions[currentIndex] && (
                      <small className="text-warning ms-3">
                        <span
                          className="spinner-border spinner-border-sm me-1"
                          style={{ width: "0.6rem", height: "0.6rem" }}
                        />
                        Saving code...
                      </small>
                    )}
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={6}
                    value={gitSubmissions[currentIndex] || ""}
                    onChange={(e) => handleGitSubmissionChange(e.target.value)}
                    placeholder="🔗 Paste your code, GitHub repository link, OneCompiler link, or any relevant submission here..."
                    disabled={!canSubmit}
                    className="border-2 border-info font-monospace"
                    style={{ fontSize: "13px", backgroundColor: "#f8f9fa" }}
                  />
                  <Form.Text className="text-muted d-flex align-items-center mt-2">
                    <span className="me-2">💡</span>
                    You can paste code snippets, provide GitHub links,
                    OneCompiler links, or any relevant submission for this
                    question.
                  </Form.Text>
                  <div className="d-flex justify-content-between mt-2">
                    <small className="text-muted">
                      {gitSubmissions[currentIndex]
                        ? gitSubmissions[currentIndex].length
                        : 0}{" "}
                      characters
                    </small>
                    {gitSubmissions[currentIndex] &&
                      gitSubmissions[currentIndex].includes("http") && (
                        <small className="text-info fw-bold">
                          🔗 Link detected!
                        </small>
                      )}
                  </div>
                </Form.Group>
              </div>

              {/* Navigation Buttons */}
              <div className="d-flex justify-content-between mt-5 pt-4 border-top">
                <Button
                  variant="outline-primary"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(currentIndex - 1)}
                  className="d-flex align-items-center px-4 py-2"
                >
                  <span className="me-2">←</span> Previous Question
                </Button>

                <div className="d-flex gap-2">
                  {currentIndex < totalQuestions - 1 ? (
                    <Button
                      variant="primary"
                      onClick={() => setCurrentIndex(currentIndex + 1)}
                      className="d-flex align-items-center px-4 py-2"
                    >
                      Next Question <span className="ms-2">→</span>
                    </Button>
                  ) : (
                    <Button
                      variant="success"
                      onClick={() =>
                        document.getElementById("final-submit").scrollIntoView()
                      }
                      className="d-flex align-items-center px-4 py-2"
                    >
                      <span className="me-2">📝</span> Review & Submit
                    </Button>
                  )}
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Final Submission Section */}
          <Card id="final-submit" className="shadow-sm border-success">
            <Card.Header className="bg-success text-white">
              <h5 className="mb-0">
                <span className="me-2">🚀</span>
                Final Submission
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              {/* Submission Summary */}
              <Card className="mb-4 bg-light">
                <Card.Body>
                  <h6 className="fw-bold mb-3">📊 Submission Summary</h6>
                  <Row>
                    <Col md={4} className="text-center">
                      <div className="p-3">
                        <h3 className="text-primary">{answeredCount}</h3>
                        <small className="text-muted">Questions Answered</small>
                        <div className="text-muted">
                          out of {totalQuestions}
                        </div>
                      </div>
                    </Col>
                    <Col md={4} className="text-center">
                      <div className="p-3">
                        <h3 className="text-info">{submissionCount}</h3>
                        <small className="text-muted">Code Submissions</small>
                        <div className="text-muted">
                          out of {totalQuestions}
                        </div>
                      </div>
                    </Col>
                    <Col md={4} className="text-center">
                      <div className="p-3">
                        <h3 className="text-success">
                          {Math.round((answeredCount / totalQuestions) * 100)}%
                        </h3>
                        <small className="text-muted">Completion Rate</small>
                        <div className="text-muted">overall progress</div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {isSubmitted ? (
                <Alert variant="success" className="text-center p-4">
                  <h4>✅ Assignment submitted successfully!</h4>
                  <p className="mb-0">
                    <strong>Submitted on:</strong> {new Date().toLocaleString()}
                  </p>
                </Alert>
              ) : (
                <div className="text-center">
                  <Button
                    variant="success"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={!canSubmit || submitLoading}
                    className="px-5 py-3"
                  >
                    {submitLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <span className="me-2">🚀</span>
                        Submit Assignment
                      </>
                    )}
                  </Button>
                  <div className="mt-3">
                    <small className="text-muted">
                      Make sure you've answered all questions before submitting
                    </small>
                  </div>
                </div>
              )}

              {!canSubmit && timeLeft <= 0 && (
                <Alert variant="danger" className="text-center mb-0">
                  <h5>⏰ Submission deadline has passed</h5>
                  <p className="mb-0">
                    You can no longer submit this assignment.
                  </p>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ✅ UPDATED: Enhanced Auto-save Toast */}
      <ToastContainer position="bottom-end" className="p-3">
        <Toast
          show={showSaveToast}
          onClose={() => setShowSaveToast(false)}
          delay={2000}
          autohide
          className="bg-success text-white"
        >
          <Toast.Body className="d-flex align-items-center">
            <span className="me-2">💾</span>
            Progress saved automatically
            <small className="ms-auto opacity-75">
              {lastSaved ? lastSaved.toLocaleTimeString() : ""}
            </small>
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
}
