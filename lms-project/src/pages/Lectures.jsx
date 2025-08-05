// src/pages/Lectures.jsx - LIST LAYOUT VERSION
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Container, Row, Col, Card, Button, Modal } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function Lectures() {
  const { userRole, currentUser } = useAuth();
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    lecture: null,
  });
  const [viewModal, setViewModal] = useState({ show: false, lecture: null });

  useEffect(() => {
    fetchLectures();
  }, []);

  const fetchLectures = async () => {
    try {
      const q = query(collection(db, "lectures"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const lecturesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setLectures(lecturesData);
    } catch (error) {
      console.error("Error fetching lectures:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "lectures", deleteModal.lecture.id));
      setLectures(lectures.filter((l) => l.id !== deleteModal.lecture.id));
      setDeleteModal({ show: false, lecture: null });
    } catch (error) {
      console.error("Error deleting lecture:", error);
    }
  };

  // Enhanced video type detection
  const getVideoType = (url) => {
    if (!url) return "none";

    // YouTube detection
    const youtubeRegex =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch && youtubeMatch[2].length === 11) {
      return { type: "youtube", id: youtubeMatch[2] };
    }

    // Masai School detection
    if (url.includes("live.masaischool.com")) {
      return { type: "masai", url };
    }

    // Direct video files
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return { type: "direct", url };
    }

    // Other external links
    return { type: "external", url };
  };

  // Open external links in new tab
  const openInNewTab = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Render video preview for list layout
  const renderVideoPreview = (lecture) => {
    const videoInfo = getVideoType(lecture.videoUrl);

    switch (videoInfo.type) {
      case "youtube":
        return (
          <img
            src={`https://img.youtube.com/vi/${videoInfo.id}/mqdefault.jpg`}
            alt={lecture.title}
            className="img-fluid rounded cursor-pointer"
            style={{ height: "120px", width: "200px", objectFit: "cover" }}
            onClick={() => setViewModal({ show: true, lecture })}
          />
        );

      case "masai":
        return (
          <div
            className="d-flex align-items-center justify-content-center rounded cursor-pointer text-white"
            style={{
              height: "120px",
              width: "200px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
            onClick={() => openInNewTab(lecture.videoUrl)}
          >
            <div className="text-center">
              <div className="fs-3 mb-1">🎓</div>
              <small className="fw-bold">Masai School</small>
            </div>
          </div>
        );

      case "external":
        return (
          <div
            className="bg-info d-flex align-items-center justify-content-center rounded cursor-pointer text-white"
            style={{ height: "120px", width: "200px" }}
            onClick={() => openInNewTab(lecture.videoUrl)}
          >
            <div className="text-center">
              <div className="fs-3 mb-1">🔗</div>
              <small className="fw-bold">External Video</small>
            </div>
          </div>
        );

      case "direct":
        return (
          <div
            className="bg-dark d-flex align-items-center justify-content-center rounded cursor-pointer text-white"
            style={{ height: "120px", width: "200px" }}
            onClick={() => setViewModal({ show: true, lecture })}
          >
            <div className="text-center">
              <div className="fs-3 mb-1">▶️</div>
              <small className="fw-bold">Video File</small>
            </div>
          </div>
        );

      default:
        return (
          <div
            className="bg-light d-flex align-items-center justify-content-center rounded"
            style={{ height: "120px", width: "200px" }}
          >
            <span className="text-muted small">No Video</span>
          </div>
        );
    }
  };

  // Render video in modal
  const renderVideoInModal = (lecture) => {
    const videoInfo = getVideoType(lecture.videoUrl);

    switch (videoInfo.type) {
      case "youtube":
        return (
          <div className="ratio ratio-16x9 mb-3">
            <iframe
              src={`https://www.youtube.com/embed/${videoInfo.id}`}
              title={lecture.title}
              allowFullScreen
              className="rounded"
            />
          </div>
        );

      case "direct":
        return (
          <video
            src={lecture.videoUrl}
            controls
            className="w-100 rounded mb-3"
            style={{ maxHeight: "400px" }}
          />
        );

      case "masai":
      case "external":
        return (
          <div className="text-center p-4 bg-light rounded mb-3">
            <div className="display-1 mb-3">🎥</div>
            <h5>External Video</h5>
            <p className="text-muted mb-3">
              This video opens in a new tab for the best experience
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => openInNewTab(lecture.videoUrl)}
            >
              🔗 Open Video in New Tab
            </Button>
          </div>
        );

      default:
        return <p className="text-muted">No video available</p>;
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading lectures..." />;
  }

  return (
    <Container className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h1>Lectures</h1>
            {(userRole === "admin" || userRole === "instructor") && (
              <Button as={Link} to="/create-lecture" variant="success">
                Create Lecture
              </Button>
            )}
          </div>
        </Col>
      </Row>

      {/* No lectures message */}
      {lectures.length === 0 ? (
        <Row>
          <Col>
            <Card>
              <Card.Body className="text-center py-5">
                <p className="text-muted fs-5">No lectures available yet.</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : (
        /* ✅ LECTURES LIST - ONE BELOW OTHER */
        <Row>
          <Col>
            {lectures.map((lecture, index) => {
              const videoInfo = getVideoType(lecture.videoUrl);

              return (
                <Card
                  key={lecture.id}
                  className={`mb-4 ${index === 0 ? "border-primary" : ""}`}
                >
                  <Card.Body>
                    <Row className="align-items-center">
                      {/* Video Preview - Left Side */}
                      <Col md={3} className="mb-3 mb-md-0">
                        {lecture.videoUrl && renderVideoPreview(lecture)}
                      </Col>

                      {/* Content - Middle */}
                      <Col md={6}>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h5 className="card-title mb-2">{lecture.title}</h5>
                          {index === 0 && (
                            <span className="badge bg-primary">Latest</span>
                          )}
                        </div>

                        {/* Notes Preview */}
                        {lecture.notes && (
                          <div className="mb-2">
                            <small className="text-muted fw-bold">Notes:</small>
                            <p className="text-muted small mb-0 mt-1">
                              {lecture.notes.length > 150
                                ? lecture.notes.substring(0, 150) + "..."
                                : lecture.notes}
                            </p>
                          </div>
                        )}

                        {/* Created Date */}
                        {lecture.createdAt && (
                          <small className="text-muted">
                            📅 Created:{" "}
                            {new Date(lecture.createdAt).toLocaleDateString()}
                          </small>
                        )}
                      </Col>

                      {/* Actions - Right Side */}
                      <Col md={3} className="text-center">
                        {/* Action Button */}
                        {videoInfo.type === "masai" ||
                        videoInfo.type === "external" ? (
                          <Button
                            variant="primary"
                            className="w-100 mb-2"
                            onClick={() => openInNewTab(lecture.videoUrl)}
                          >
                            🔗 Open Video in New Tab
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            className="w-100 mb-2"
                            onClick={() =>
                              setViewModal({ show: true, lecture })
                            }
                          >
                            ▶️ View Lecture
                          </Button>
                        )}

                        {/* Admin/Instructor Actions */}
                        {(userRole === "admin" ||
                          (userRole === "instructor" &&
                            lecture.createdBy === currentUser.uid)) && (
                          <div className="d-flex gap-1 justify-content-center">
                            <Button variant="outline-primary" size="sm">
                              Edit
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() =>
                                setDeleteModal({ show: true, lecture })
                              }
                            >
                              Delete
                            </Button>
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

      {/* View Modal */}
      <Modal
        show={viewModal.show}
        onHide={() => setViewModal({ show: false, lecture: null })}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>{viewModal.lecture?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewModal.lecture?.videoUrl && renderVideoInModal(viewModal.lecture)}

          {viewModal.lecture?.notes && (
            <Card>
              <Card.Body>
                <h6 className="mb-2">Lecture Notes:</h6>
                <div className="text-muted" style={{ whiteSpace: "pre-wrap" }}>
                  {viewModal.lecture.notes}
                </div>
              </Card.Body>
            </Card>
          )}
        </Modal.Body>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        show={deleteModal.show}
        onHide={() => setDeleteModal({ show: false, lecture: null })}
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete "{deleteModal.lecture?.title}"? This
          action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setDeleteModal({ show: false, lecture: null })}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
