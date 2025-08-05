// src/pages/CreateLecture.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
} from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import { collection, addDoc } from "firebase/firestore"; // ✅ Firestore import
import { db } from "../firebase"; // Firestore instance

export default function CreateLecture() {
  const [formData, setFormData] = useState({
    title: "",
    videoUrl: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { currentUser } = useAuth();
  const navigate = useNavigate();

  /* ------------------------- input handlers ------------------------- */
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  /* ------------------------- submit handler ------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");
      setLoading(true);

      const lectureData = {
        ...formData,
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
      };

      // ✅ Write to Firestore, NOT Realtime DB
      await addDoc(collection(db, "lectures"), lectureData);

      navigate("/lectures");
    } catch (err) {
      setError("Failed to create lecture: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------ UI ------------------------------ */
  return (
    <Container className="py-4">
      <Row>
        <Col lg={8} className="mx-auto">
          <h1 className="mb-4">Create Lecture</h1>

          <Card>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                {/* Title */}
                <Form.Group className="mb-3">
                  <Form.Label>Lecture Title</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Enter lecture title"
                  />
                </Form.Group>

                {/* Video URL */}
                <Form.Group className="mb-3">
                  <Form.Label>Video URL</Form.Label>
                  <Form.Control
                    type="url"
                    name="videoUrl"
                    value={formData.videoUrl}
                    onChange={handleChange}
                    placeholder="Enter YouTube URL or video link"
                  />
                  <Form.Text className="text-muted">
                    Supports YouTube links and direct video URLs
                  </Form.Text>
                </Form.Group>

                {/* Notes */}
                <Form.Group className="mb-4">
                  <Form.Label>Lecture Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={8}
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Enter lecture notes, key points, or additional resources"
                  />
                </Form.Group>

                {/* Buttons */}
                <div className="d-flex gap-3">
                  <Button
                    type="submit"
                    variant="success"
                    disabled={loading}
                    className="flex-fill"
                  >
                    {loading ? "Creating..." : "Create Lecture"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate("/lectures")}
                    className="flex-fill"
                  >
                    Cancel
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
