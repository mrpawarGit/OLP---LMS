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
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function CreateAssignment() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    deadline: "",
    questions: [{ prompt: "" }],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const addQuestion = () => {
    setForm({
      ...form,
      questions: [...form.questions, { prompt: "" }],
    });
  };

  const removeQuestion = (idx) => {
    if (form.questions.length <= 1) return; // Keep at least one question
    setForm({
      ...form,
      questions: form.questions.filter((_, i) => i !== idx),
    });
  };

  const handleQuestionChange = (idx, value) => {
    const questions = [...form.questions];
    questions[idx].prompt = value;
    setForm({ ...form, questions });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) return setError("Title is required");
    if (!form.deadline) return setError("Deadline is required");
    if (form.questions.some((q) => !q.prompt.trim())) {
      return setError("All questions must have content");
    }

    try {
      setError("");
      setLoading(true);

      await addDoc(collection(db, "assignments"), {
        ...form,
        questions: form.questions.map((q) => ({
          id: crypto.randomUUID(),
          prompt: q.prompt.trim(),
        })),
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
      });

      navigate("/assignments");
    } catch (err) {
      setError("Failed to create assignment: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <Row>
        <Col lg={8} className="mx-auto">
          <h1 className="mb-4">Create Assignment</h1>

          <Card>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Assignment Title</Form.Label>
                  <Form.Control
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="Enter assignment title"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Enter assignment description"
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Deadline</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    name="deadline"
                    value={form.deadline}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <h5 className="mb-3">Questions ({form.questions.length})</h5>

                {form.questions.map((question, idx) => (
                  <Form.Group key={idx} className="mb-3">
                    <Form.Label>Question {idx + 1}</Form.Label>
                    <div className="d-flex gap-2">
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={question.prompt}
                        onChange={(e) =>
                          handleQuestionChange(idx, e.target.value)
                        }
                        placeholder={`Enter question ${idx + 1}`}
                        required
                      />
                      <Button
                        variant="outline-danger"
                        onClick={() => removeQuestion(idx)}
                        disabled={form.questions.length <= 1}
                      >
                        ×
                      </Button>
                    </div>
                  </Form.Group>
                ))}

                <Button
                  variant="outline-primary"
                  onClick={addQuestion}
                  className="mb-4"
                >
                  + Add Question
                </Button>

                <div className="d-flex gap-3">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-fill"
                  >
                    {loading ? "Creating..." : "Create Assignment"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => navigate("/assignments")}
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
