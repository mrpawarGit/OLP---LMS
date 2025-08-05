// src/pages/Dashboard.jsx - CORRECTED FOR FIRESTORE
import { useState, useEffect } from "react";
import { Container, Row, Col, Card } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import { collection, getDocs } from "firebase/firestore"; // ✅ Firestore imports
import { db } from "../firebase";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function Dashboard() {
  const { currentUser, userRole } = useAuth();
  const [stats, setStats] = useState({
    assignments: 0,
    lectures: 0,
    users: 0,
  });
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [recentLectures, setRecentLectures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [userRole]);

  const fetchDashboardData = async () => {
    try {
      // ✅ Fetch assignments from Firestore
      const assignmentsSnapshot = await getDocs(collection(db, "assignments"));
      const assignments = assignmentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // ✅ Fetch lectures from Firestore
      const lecturesSnapshot = await getDocs(collection(db, "lectures"));
      const lectures = lecturesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // ✅ Fetch users count (for admin only)
      let usersCount = 0;
      if (userRole === "admin") {
        const usersSnapshot = await getDocs(collection(db, "users"));
        usersCount = usersSnapshot.size;
      }

      setStats({
        assignments: assignments.length,
        lectures: lectures.length,
        users: usersCount,
      });

      // Get recent assignments (upcoming deadlines)
      const sortedAssignments = assignments
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5);

      setRecentAssignments(sortedAssignments);

      // Get recent lectures
      const sortedLectures = lectures
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 5);

      setRecentLectures(sortedLectures);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDeadline = (deadline) => {
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: "Overdue", class: "deadline-overdue" };
    if (diffDays === 0) return { text: "Due today", class: "deadline-today" };
    if (diffDays === 1)
      return { text: "Due tomorrow", class: "deadline-today" };
    if (diffDays <= 3)
      return { text: `Due in ${diffDays} days`, class: "deadline-soon" };
    return { text: `Due in ${diffDays} days`, class: "deadline-ok" };
  };

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <Container className="py-4">
      <Row>
        <Col>
          <h1 className="mb-4">
            Welcome, <span className="text-capitalize">{userRole}</span>!
          </h1>
        </Col>
      </Row>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={4} className="mb-3">
          <Card className="h-100 text-center">
            <Card.Body>
              <div className="display-4 text-primary mb-2">
                {stats.assignments}
              </div>
              <Card.Text className="text-muted">
                {userRole === "student"
                  ? "Available Assignments"
                  : "Total Assignments"}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="mb-3">
          <Card className="h-100 text-center">
            <Card.Body>
              <div className="display-4 text-success mb-2">
                {stats.lectures}
              </div>
              <Card.Text className="text-muted">
                {userRole === "student"
                  ? "Available Lectures"
                  : "Total Lectures"}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        {userRole === "admin" && (
          <Col md={4} className="mb-3">
            <Card className="h-100 text-center">
              <Card.Body>
                <div className="display-4 text-info mb-2">{stats.users}</div>
                <Card.Text className="text-muted">Total Users</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      <Row>
        {/* Recent/Upcoming Assignments */}
        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">
                {userRole === "student"
                  ? "Upcoming Assignments"
                  : "Recent Assignments"}
              </h5>
            </Card.Header>
            <Card.Body>
              {recentAssignments.length > 0 ? (
                recentAssignments.map((assignment) => {
                  const deadline = formatDeadline(assignment.deadline);
                  return (
                    <div
                      key={assignment.id}
                      className="border-start border-primary border-3 ps-3 mb-3"
                    >
                      <h6 className="fw-bold">{assignment.title}</h6>
                      <p className={`small mb-0 ${deadline.class}`}>
                        {userRole === "student"
                          ? deadline.text
                          : `Deadline: ${new Date(
                              assignment.deadline
                            ).toLocaleDateString()}`}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-muted text-center">
                  No assignments available
                </p>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Recent Lectures */}
        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Recent Lectures</h5>
            </Card.Header>
            <Card.Body>
              {recentLectures.length > 0 ? (
                recentLectures.map((lecture) => (
                  <div
                    key={lecture.id}
                    className="border-start border-success border-3 ps-3 mb-3"
                  >
                    <h6 className="fw-bold">{lecture.title}</h6>
                    <p className="text-muted small mb-0">
                      {lecture.createdAt
                        ? new Date(lecture.createdAt).toLocaleDateString()
                        : "Date not available"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-muted text-center">No lectures available</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
