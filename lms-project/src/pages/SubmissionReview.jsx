import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Modal,
  Badge,
  Alert,
  Form,
  InputGroup,
  Dropdown,
  Tabs,
  Tab,
} from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function SubmissionReview() {
  const { id } = useParams();
  const { userRole } = useAuth();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [users, setUsers] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    if (userRole !== "admin" && userRole !== "instructor") {
      navigate("/unauthorized");
      return;
    }
    fetchData();
  }, [userRole]);

  const fetchData = async () => {
    try {
      // Fetch assignment details
      const assignmentDoc = await getDoc(doc(db, "assignments", id));
      if (!assignmentDoc.exists()) {
        navigate("/assignments");
        return;
      }
      setAssignment({ id, ...assignmentDoc.data() });

      // Fetch all submissions for this assignment
      const submissionsQuery = await getDocs(
        collection(db, "assignments", id, "submissions")
      );
      const submissionsData = submissionsQuery.docs.map((doc) => ({
        userId: doc.id,
        ...doc.data(),
      }));

      // Sort by submission time (newest first)
      submissionsData.sort((a, b) => {
        const timeA = a.submittedAt?.seconds || 0;
        const timeB = b.submittedAt?.seconds || 0;
        return timeB - timeA;
      });

      setSubmissions(submissionsData);

      // Fetch user details for each submission
      const userMap = new Map();
      for (const submission of submissionsData) {
        try {
          const userDoc = await getDoc(doc(db, "users", submission.userId));
          if (userDoc.exists()) {
            userMap.set(submission.userId, userDoc.data());
          }
        } catch (error) {
          console.error(`Error fetching user ${submission.userId}:`, error);
        }
      }
      setUsers(userMap);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const openSubmissionModal = (submission) => {
    setSelectedSubmission(submission);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedSubmission(null);
    setShowModal(false);
  };

  const getSubmissionStatus = (submittedAt, deadline) => {
    const submissionTime = new Date(
      submittedAt?.seconds ? submittedAt.seconds * 1000 : submittedAt
    );
    const deadlineTime = new Date(deadline);

    if (submissionTime <= deadlineTime) {
      return { text: "On Time", variant: "success" };
    } else {
      const diffHours = (submissionTime - deadlineTime) / (1000 * 60 * 60);
      if (diffHours <= 24) {
        return { text: `Late (${Math.round(diffHours)}h)`, variant: "warning" };
      } else {
        const diffDays = Math.round(diffHours / 24);
        return { text: `Late (${diffDays}d)`, variant: "danger" };
      }
    }
  };

  const getCompletionRate = (answers, totalQuestions) => {
    const answered = answers?.filter((a) => a && a.trim()).length || 0;
    return Math.round((answered / totalQuestions) * 100);
  };

  // ✅ NEW: Get git submissions count
  const getGitSubmissionCount = (gitSubmissions) => {
    if (!gitSubmissions) return 0;
    return gitSubmissions.filter((sub) => sub && sub.trim()).length;
  };

  // ✅ NEW: Check if submission has any GitHub links
  const hasGitHubLinks = (gitSubmissions) => {
    if (!gitSubmissions) return false;
    return gitSubmissions.some(
      (sub) => sub && sub.toLowerCase().includes("github.com")
    );
  };

  const exportSubmissions = () => {
    const csvData = submissions.map((submission) => {
      const user = users.get(submission.userId) || {};
      const status = getSubmissionStatus(
        submission.submittedAt,
        assignment.deadline
      );
      const completionRate = getCompletionRate(
        submission.answers,
        assignment.questions?.length || 0
      );
      const gitSubmissionCount = getGitSubmissionCount(
        submission.gitSubmissions
      );

      return {
        Name: user.name || "Unknown",
        Email: user.email || "Unknown",
        SubmittedAt: new Date(
          submission.submittedAt?.seconds
            ? submission.submittedAt.seconds * 1000
            : submission.submittedAt
        ).toLocaleString(),
        Status: status.text,
        CompletionRate: `${completionRate}%`,
        AnsweredQuestions: `${submission.answeredQuestions || 0}/${
          assignment.questions?.length || 0
        }`,
        CodeSubmissions: `${gitSubmissionCount}/${
          assignment.questions?.length || 0
        }`,
        HasGitHubLinks: hasGitHubLinks(submission.gitSubmissions)
          ? "Yes"
          : "No",
      };
    });

    const csvContent = [
      Object.keys(csvData[0] || {}).join(","),
      ...csvData.map((row) =>
        Object.values(row)
          .map((val) => `"${val}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${
      assignment?.title?.replace(/[^a-z0-9]/gi, "_") || "assignment"
    }_submissions.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredSubmissions = submissions.filter((submission) => {
    const user = users.get(submission.userId) || {};
    const matchesSearch =
      !searchTerm ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === "all") return matchesSearch;

    const status = getSubmissionStatus(
      submission.submittedAt,
      assignment.deadline
    );
    if (filterStatus === "ontime")
      return matchesSearch && status.variant === "success";
    if (filterStatus === "late")
      return matchesSearch && status.variant !== "success";

    return matchesSearch;
  });

  if (loading) {
    return <LoadingSpinner message="Loading submissions..." />;
  }

  if (!assignment) return null;

  const onTimeCount = submissions.filter(
    (s) =>
      getSubmissionStatus(s.submittedAt, assignment.deadline).variant ===
      "success"
  ).length;
  const lateCount = submissions.length - onTimeCount;

  return (
    <Container className="py-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>{assignment.title} - Submissions</h2>
              <p className="text-muted mb-0">
                📊 {submissions.length} total submissions • ✅ {onTimeCount} on
                time • ⏰ {lateCount} late • 📅 Due:{" "}
                {new Date(assignment.deadline).toLocaleDateString()}
              </p>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-success"
                onClick={exportSubmissions}
                disabled={submissions.length === 0}
              >
                📥 Export CSV
              </Button>
              <Button
                variant="outline-secondary"
                onClick={() => navigate("/assignments")}
              >
                ← Back
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="text-primary">{submissions.length}</h3>
                  <p className="mb-0 small text-muted">Total Submissions</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="text-success">{onTimeCount}</h3>
                  <p className="mb-0 small text-muted">On Time</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="text-warning">{lateCount}</h3>
                  <p className="mb-0 small text-muted">Late</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="text-info">
                    {submissions.length > 0
                      ? Math.round((onTimeCount / submissions.length) * 100)
                      : 0}
                    %
                  </h3>
                  <p className="mb-0 small text-muted">On-Time Rate</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Filters and Search */}
          <Card className="mb-4">
            <Card.Body>
              <Row>
                <Col md={6}>
                  <InputGroup>
                    <Form.Control
                      placeholder="Search by student name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </Col>
                <Col md={6}>
                  <Dropdown>
                    <Dropdown.Toggle
                      variant="outline-secondary"
                      className="w-100"
                    >
                      Filter:{" "}
                      {filterStatus === "all"
                        ? "All Submissions"
                        : filterStatus === "ontime"
                        ? "On Time"
                        : "Late"}
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="w-100">
                      <Dropdown.Item onClick={() => setFilterStatus("all")}>
                        All Submissions
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => setFilterStatus("ontime")}>
                        On Time Only
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => setFilterStatus("late")}>
                        Late Only
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {filteredSubmissions.length === 0 ? (
            <Alert variant="info">
              {submissions.length === 0
                ? "📭 No submissions yet for this assignment."
                : "🔍 No submissions match your search criteria."}
            </Alert>
          ) : (
            <Card>
              <Card.Body>
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Submitted</th>
                      <th>Status</th>
                      <th>Answers</th>
                      <th>Code/Links</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((submission) => {
                      const user = users.get(submission.userId) || {};
                      const status = getSubmissionStatus(
                        submission.submittedAt,
                        assignment.deadline
                      );
                      const completionRate = getCompletionRate(
                        submission.answers,
                        assignment.questions?.length || 0
                      );
                      const gitSubmissionCount = getGitSubmissionCount(
                        submission.gitSubmissions
                      );

                      return (
                        <tr key={submission.userId}>
                          <td>
                            <div>
                              <strong>{user.name || "Unknown Student"}</strong>
                              <br />
                              <small className="text-muted">
                                {user.email || "Unknown"}
                              </small>
                            </div>
                          </td>
                          <td>
                            <small>
                              {new Date(
                                submission.submittedAt?.seconds
                                  ? submission.submittedAt.seconds * 1000
                                  : submission.submittedAt
                              ).toLocaleString()}
                            </small>
                          </td>
                          <td>
                            <Badge bg={status.variant}>{status.text}</Badge>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <Badge
                                bg={
                                  completionRate === 100
                                    ? "success"
                                    : completionRate >= 80
                                    ? "warning"
                                    : "danger"
                                }
                              >
                                {completionRate}%
                              </Badge>
                              <small className="text-muted">
                                ({submission.answeredQuestions || 0}/
                                {assignment.questions?.length || 0})
                              </small>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <Badge
                                bg={
                                  gitSubmissionCount > 0 ? "info" : "secondary"
                                }
                              >
                                📂 {gitSubmissionCount}/
                                {assignment.questions?.length || 0}
                              </Badge>
                              {hasGitHubLinks(submission.gitSubmissions) && (
                                <Badge bg="success" className="small">
                                  🔗 GitHub
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => openSubmissionModal(submission)}
                            >
                              📝 Review
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}

          {/* ✅ UPDATED: Submission Detail Modal with Tabs */}
          <Modal show={showModal} onHide={closeModal} size="xl">
            <Modal.Header closeButton>
              <Modal.Title>
                📋 Submission Review -{" "}
                {users.get(selectedSubmission?.userId)?.name ||
                  "Unknown Student"}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ maxHeight: "80vh", overflowY: "auto" }}>
              {selectedSubmission && (
                <div>
                  {/* Student Info */}
                  <Card className="mb-4">
                    <Card.Body>
                      <Row>
                        <Col md={4}>
                          <strong>Student:</strong>{" "}
                          {users.get(selectedSubmission.userId)?.name ||
                            "Unknown"}
                        </Col>
                        <Col md={4}>
                          <strong>Email:</strong>{" "}
                          {users.get(selectedSubmission.userId)?.email ||
                            "Unknown"}
                        </Col>
                        <Col md={4}>
                          <strong>Submitted:</strong>{" "}
                          {new Date(
                            selectedSubmission.submittedAt?.seconds
                              ? selectedSubmission.submittedAt.seconds * 1000
                              : selectedSubmission.submittedAt
                          ).toLocaleString()}
                        </Col>
                        <Col md={4} className="mt-2">
                          <strong>Status:</strong>{" "}
                          <Badge
                            bg={
                              getSubmissionStatus(
                                selectedSubmission.submittedAt,
                                assignment.deadline
                              ).variant
                            }
                          >
                            {
                              getSubmissionStatus(
                                selectedSubmission.submittedAt,
                                assignment.deadline
                              ).text
                            }
                          </Badge>
                        </Col>
                        <Col md={4} className="mt-2">
                          <strong>Answers:</strong>{" "}
                          <Badge bg="primary">
                            {getCompletionRate(
                              selectedSubmission.answers,
                              assignment.questions?.length || 0
                            )}
                            %
                          </Badge>
                        </Col>
                        <Col md={4} className="mt-2">
                          <strong>Code Submissions:</strong>{" "}
                          <Badge bg="info">
                            {getGitSubmissionCount(
                              selectedSubmission.gitSubmissions
                            )}
                            /{assignment.questions?.length || 0}
                          </Badge>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>

                  {/* ✅ NEW: Tabbed view for Questions */}
                  <Tabs defaultActiveKey="all" className="mb-3">
                    <Tab eventKey="all" title="📋 All Questions">
                      {assignment.questions?.map((question, index) => (
                        <Card key={index} className="mb-3">
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <h6 className="text-primary mb-0">
                                Question {index + 1}
                              </h6>
                              <div className="d-flex gap-2">
                                {selectedSubmission.answers?.[
                                  index
                                ]?.trim() && (
                                  <Badge bg="success">✓ Answered</Badge>
                                )}
                                {selectedSubmission.gitSubmissions?.[
                                  index
                                ]?.trim() && (
                                  <Badge bg="info">📂 Code/Link</Badge>
                                )}
                              </div>
                            </div>
                            <p className="mb-3 fw-bold">{question.prompt}</p>

                            {/* Student Answer */}
                            <div className="mb-3">
                              <strong>📝 Student Answer:</strong>
                              <div
                                className="mt-2 p-3 bg-light rounded"
                                style={{ whiteSpace: "pre-wrap" }}
                              >
                                {selectedSubmission.answers?.[
                                  index
                                ]?.trim() || (
                                  <em className="text-muted">
                                    No answer provided
                                  </em>
                                )}
                              </div>
                              {selectedSubmission.answers?.[index]?.trim() && (
                                <small className="text-muted">
                                  {selectedSubmission.answers[index].length}{" "}
                                  characters
                                </small>
                              )}
                            </div>

                            {/* ✅ NEW: Git Submission for this question */}
                            {selectedSubmission.gitSubmissions?.[
                              index
                            ]?.trim() && (
                              <div>
                                <strong>📂 Code/Repository Submission:</strong>
                                <div
                                  className="mt-2 p-3 bg-info bg-opacity-10 rounded border border-info"
                                  style={{ whiteSpace: "pre-wrap" }}
                                >
                                  {selectedSubmission.gitSubmissions[index]}
                                </div>
                                <small className="text-muted">
                                  {
                                    selectedSubmission.gitSubmissions[index]
                                      .length
                                  }{" "}
                                  characters
                                </small>

                                {/* Check if it's a GitHub link */}
                                {selectedSubmission.gitSubmissions[index]
                                  .toLowerCase()
                                  .includes("github.com") && (
                                  <div className="mt-2">
                                    <Button
                                      size="sm"
                                      variant="outline-primary"
                                      href={
                                        selectedSubmission.gitSubmissions[index]
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      🔗 Open GitHub Link
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      ))}
                    </Tab>

                    <Tab eventKey="answers" title="📝 Answers Only">
                      {assignment.questions?.map(
                        (question, index) =>
                          selectedSubmission.answers?.[index]?.trim() && (
                            <Card key={index} className="mb-3">
                              <Card.Body>
                                <h6 className="text-primary">
                                  Question {index + 1}
                                </h6>
                                <p className="mb-2 fw-bold">
                                  {question.prompt}
                                </p>
                                <div
                                  className="p-3 bg-light rounded"
                                  style={{ whiteSpace: "pre-wrap" }}
                                >
                                  {selectedSubmission.answers[index]}
                                </div>
                              </Card.Body>
                            </Card>
                          )
                      )}
                    </Tab>

                    <Tab eventKey="code" title="📂 Code/Links Only">
                      {assignment.questions?.map(
                        (question, index) =>
                          selectedSubmission.gitSubmissions?.[
                            index
                          ]?.trim() && (
                            <Card key={index} className="mb-3">
                              <Card.Body>
                                <h6 className="text-primary">
                                  Question {index + 1} - Code/Repository
                                </h6>
                                <p className="mb-2 small text-muted">
                                  {question.prompt}
                                </p>
                                <div
                                  className="p-3 bg-info bg-opacity-10 rounded border border-info"
                                  style={{ whiteSpace: "pre-wrap" }}
                                >
                                  {selectedSubmission.gitSubmissions[index]}
                                </div>

                                {selectedSubmission.gitSubmissions[index]
                                  .toLowerCase()
                                  .includes("github.com") && (
                                  <div className="mt-2">
                                    <Button
                                      size="sm"
                                      variant="outline-primary"
                                      href={
                                        selectedSubmission.gitSubmissions[index]
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      🔗 Open GitHub Link
                                    </Button>
                                  </div>
                                )}
                              </Card.Body>
                            </Card>
                          )
                      )}
                    </Tab>
                  </Tabs>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={closeModal}>
                Close
              </Button>
              {/* Show GitHub links if any exist */}
              {selectedSubmission?.gitSubmissions?.some(
                (sub) => sub && sub.toLowerCase().includes("github.com")
              ) && (
                <Badge bg="success" className="me-2">
                  🔗 Contains GitHub Links
                </Badge>
              )}
            </Modal.Footer>
          </Modal>
        </Col>
      </Row>
    </Container>
  );
}
