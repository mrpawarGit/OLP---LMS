import { Card, Row, Col, ProgressBar } from "react-bootstrap";

export default function SubmissionStats({ assignment, submissions }) {
  const totalStudents = 50; // You can fetch this from your users collection
  const submissionRate = (submissions.length / totalStudents) * 100;

  const onTimeSubmissions = submissions.filter((sub) => {
    const submitTime = new Date(
      sub.submittedAt?.seconds
        ? sub.submittedAt.seconds * 1000
        : sub.submittedAt
    );
    const deadline = new Date(assignment.deadline);
    return submitTime <= deadline;
  }).length;

  const lateSubmissions = submissions.length - onTimeSubmissions;

  return (
    <Row className="mb-4">
      <Col md={3}>
        <Card className="text-center">
          <Card.Body>
            <h3 className="text-primary">{submissions.length}</h3>
            <p className="mb-0">Total Submissions</p>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3}>
        <Card className="text-center">
          <Card.Body>
            <h3 className="text-success">{onTimeSubmissions}</h3>
            <p className="mb-0">On Time</p>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3}>
        <Card className="text-center">
          <Card.Body>
            <h3 className="text-warning">{lateSubmissions}</h3>
            <p className="mb-0">Late</p>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3}>
        <Card className="text-center">
          <Card.Body>
            <h3 className="text-info">{Math.round(submissionRate)}%</h3>
            <p className="mb-0">Submission Rate</p>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
