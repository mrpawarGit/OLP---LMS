// src/components/common/Navbar.jsx - COMPLETE FILE
import { Link, useNavigate } from "react-router-dom";
import { Navbar, Nav, Container, NavDropdown } from "react-bootstrap";
import { useAuth } from "../../contexts/AuthContext";

export default function AppNavbar() {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <Navbar bg="primary" variant="dark" expand="lg" sticky="top">
      <Container>
        <Navbar.Brand as={Link} to="/dashboard">
          OLP
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />

        {currentUser && (
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/dashboard">
                Dashboard
              </Nav.Link>
              <Nav.Link as={Link} to="/assignments">
                Assignments
              </Nav.Link>
              <Nav.Link as={Link} to="/lectures">
                Lectures
              </Nav.Link>

              {(userRole === "admin" || userRole === "instructor") && (
                <NavDropdown title="Create" id="create-dropdown">
                  <NavDropdown.Item as={Link} to="/create-assignment">
                    New Assignment
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/create-lecture">
                    New Lecture
                  </NavDropdown.Item>
                </NavDropdown>
              )}
            </Nav>

            <Nav>
              <NavDropdown
                align="end"
                title={`${userRole} | ${currentUser.email}`}
                id="user-dropdown"
              >
                <NavDropdown.Item onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right me-2"></i>
                  Logout
                </NavDropdown.Item>
              </NavDropdown>
            </Nav>
          </Navbar.Collapse>
        )}
      </Container>
    </Navbar>
  );
}
