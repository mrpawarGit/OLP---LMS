import { Link } from "react-router-dom";
import { Container, Row, Col, Card, Button } from "react-bootstrap";

export default function Unauthorized() {
  return (
    <Container className="min-vh-100 d-flex align-items-center justify-content-center">
      <Row>
        <Col md={6} lg={4} className="mx-auto">
          <Card className="text-center">
            <Card.Body className="py-5">
              <div className="display-1 text-danger mb-3">🚫</div>
              <h2 className="mb-3">Access Denied</h2>
              <p className="text-muted mb-4">
                You don't have permission to access this resource.
              </p>
              <Button as={Link} to="/dashboard" variant="primary">
                Go to Dashboard
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
