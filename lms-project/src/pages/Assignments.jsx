import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Alert,
} from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function Assignments() {
  const { userRole, currentUser } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState(new Map());
  const [submissionCounts, setSubmissionCounts] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (userRole && currentUser) {
      fetchAssignments();
    }
  }, [userRole, currentUser]);

  const fetchAssignments = async () => {
    try {
      setError("");
      console.log("Fetching assignments...", {
        userRole,
        currentUser: !!currentUser,
      });

      const querySnapshot = await getDocs(collection(db, "assignments"));
      const assignmentsData = querySnapshot.docs.map((doc) => {
        console.log("Assignment doc:", doc.id, doc.data());
        return {
          id: doc.id,
          ...doc.data(),
        };
      });

      // Sort by creation date (newest first)
      assignmentsData.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setAssignments(assignmentsData);

      // For students, check submission status
      if (userRole === "student") {
        const submissionMap = new Map();
        for (const assignment of assignmentsData) {
          try {
            const submissionDoc = await getDoc(
              doc(
                db,
                "assignments",
                assignment.id,
                "submissions",
                currentUser.uid
              )
            );
            submissionMap.set(assignment.id, submissionDoc.exists());
          } catch (error) {
            console.log("Error checking submission:", error);
            submissionMap.set(assignment.id, false);
          }
        }
        setSubmissions(submissionMap);
      }

      // For instructors/admins, get submission counts
      if (userRole === "instructor" || userRole === "admin") {
        const countMap = new Map();
        for (const assignment of assignmentsData) {
          try {
            const submissionsSnapshot = await getDocs(
              collection(db, "assignments", assignment.id, "submissions")
            );
            countMap.set(assignment.id, submissionsSnapshot.size);
          } catch (error) {
            console.log("Error fetching submission count:", error);
            countMap.set(assignment.id, 0);
          }
        }
        setSubmissionCounts(countMap);
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setError("Failed to load assignments. Please check your permissions.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (assignmentId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this assignment? This will also delete all submissions."
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "assignments", assignmentId));
      setAssignments(assignments.filter((a) => a.id !== assignmentId));
    } catch (error) {
      console.error("Error deleting assignment:", error);
      alert("Failed to delete assignment");
    }
  };

  const getDeadlineStatus = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: "Overdue", variant: "danger" };
    if (diffDays === 0) return { text: "Due today", variant: "warning" };
    if (diffDays <= 3)
      return { text: `Due in ${diffDays} days`, variant: "warning" };
    return { text: `Due in ${diffDays} days`, variant: "success" };
  };

  if (loading) {
    return <LoadingSpinner message="Loading assignments..." />;
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          <h5>Error Loading Assignments</h5>
          <p>{error}</p>
          <Button onClick={fetchAssignments}>Try Again</Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h1>Assignments</h1>
            {(userRole === "admin" || userRole === "instructor") && (
              <Button as={Link} to="/create-assignment" variant="primary">
                + Create Assignment
              </Button>
            )}
          </div>
        </Col>
      </Row>

      {assignments.length === 0 ? (
        <Row>
          <Col>
            <Card>
              <Card.Body className="text-center py-5">
                <div className="mb-3">📚</div>
                <h5>No assignments yet</h5>
                <p className="text-muted">
                  {userRole === "student"
                    ? "Your instructor hasn't posted any assignments yet."
                    : "Create your first assignment to get started."}
                </p>
                {(userRole === "admin" || userRole === "instructor") && (
                  <Button as={Link} to="/create-assignment" variant="primary">
                    Create First Assignment
                  </Button>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : (
        <Row>
          <Col>
            {assignments.map((assignment) => {
              const deadlineStatus = getDeadlineStatus(assignment.deadline);
              const isSubmitted = submissions.get(assignment.id) || false;
              const questionCount = assignment.questions?.length || 0;
              const submissionCount = submissionCounts.get(assignment.id) || 0;

              return (
                <Card key={assignment.id} className="mb-4 shadow-sm">
                  <Card.Body>
                    <Row className="align-items-center">
                      <Col md={8}>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <h5 className="card-title mb-0">
                            {assignment.title}
                          </h5>

                          {userRole === "student" && isSubmitted && (
                            <Badge bg="success">✓ Submitted</Badge>
                          )}

                          <Badge bg="info" className="rounded-pill">
                            {questionCount} Questions
                          </Badge>

                          {(userRole === "instructor" ||
                            userRole === "admin") && (
                            <Badge bg="secondary" className="rounded-pill">
                              {submissionCount} Submissions
                            </Badge>
                          )}
                        </div>

                        <p className="card-text text-muted mb-2">
                          {assignment.description || "No description provided"}
                        </p>

                        <div className="d-flex align-items-center gap-3">
                          <Alert
                            variant={deadlineStatus.variant}
                            className="py-1 px-2 mb-0 small"
                          >
                            {deadlineStatus.text}
                          </Alert>
                          <small className="text-muted">
                            📅 Due:{" "}
                            {new Date(assignment.deadline).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "short",
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </small>
                          <small className="text-muted">
                            👤 by{" "}
                            {assignment.createdBy === currentUser.uid
                              ? "You"
                              : "Instructor"}
                          </small>
                        </div>
                      </Col>

                      <Col md={4} className="text-end">
                        {userRole === "student" ? (
                          <Button
                            as={Link}
                            to={`/assignments/${assignment.id}`}
                            variant={
                              isSubmitted ? "outline-primary" : "primary"
                            }
                            className="me-2"
                          >
                            {isSubmitted ? "📝 Review" : "🚀 Start Assignment"}
                          </Button>
                        ) : (
                          <div className="d-flex gap-2 justify-content-end flex-wrap">
                            <Button
                              as={Link}
                              to={`/assignments/${assignment.id}`}
                              variant="outline-primary"
                              size="sm"
                            >
                              👀 Preview
                            </Button>
                            <Button
                              as={Link}
                              to={`/assignments/${assignment.id}/submissions`}
                              variant="outline-success"
                              size="sm"
                            >
                              📊 Submissions ({submissionCount})
                            </Button>
                            {(userRole === "admin" ||
                              assignment.createdBy === currentUser.uid) && (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDelete(assignment.id)}
                              >
                                🗑️ Delete
                              </Button>
                            )}
                          </div>
                        )}
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              );
            })}
          </Col>
        </Row>
      )}
    </Container>
  );
}
