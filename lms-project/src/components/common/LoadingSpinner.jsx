import { Spinner, Container, Row, Col } from "react-bootstrap";

export default function LoadingSpinner({ message = "Loading..." }) {
  return (
    <Container className="min-vh-100 d-flex align-items-center justify-content-center">
      <Row>
        <Col className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted">{message}</p>
        </Col>
      </Row>
    </Container>
  );
}
