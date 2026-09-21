import React, { useState, useEffect } from "react";
import { useLocation, useHistory } from "react-router-dom";
import { Navbar, Container, Nav, Dropdown, Button, Badge } from "react-bootstrap";
import routes from "routes.js";
import { 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  Menu,
  Search,
  Moon,
  Sun,
  Globe
} from "lucide-react";

function AdminNavbar() {
  const history = useHistory();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("userRole") || "ADMIN";
    setUserRole(role);
    
    // Vérifier le mode sombre depuis le localStorage
    const darkMode = localStorage.getItem("darkMode") === "true";
    setIsDarkMode(darkMode);
    if (darkMode) {
      document.body.classList.add("dark-mode");
    }
  }, []);

  const mobileSidebarToggle = (e) => {
    e.preventDefault();
    document.documentElement.classList.toggle("nav-open");
    let node = document.createElement("div");
    node.id = "bodyClick";
    node.onclick = function () {
      this.parentElement.removeChild(this);
      document.documentElement.classList.toggle("nav-open");
    };
    document.body.appendChild(node);
  };

  const handleLogout = () => {
    localStorage.removeItem("userLoggedIn");
    localStorage.removeItem("jwt");
    localStorage.removeItem("userRole");
    localStorage.removeItem("email");
    localStorage.removeItem("avatarId");
    localStorage.removeItem("stallId");
    localStorage.removeItem("exhibitionId");
    history.push("/login");
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem("darkMode", newMode.toString());
    if (newMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  };

  const getBrandText = () => {
    for (let i = 0; i < routes.length; i++) {
      if (location.pathname.indexOf(routes[i].layout + routes[i].path) !== -1) {
        return routes[i].name;
      }
    }
    return "";
  };

  const getRoleIcon = (role) => {
    switch(role) {
      case "ADMIN": return "👑";
      case "EX_OWNER": return "🏢";
      case "EXHIBITOR": return "🎨";
      case "ATTENDEE": return "🎟️";
      default: return "👤";
    }
  };

  return (
    <Navbar 
      expand="lg" 
      style={{
        background: isDarkMode ? 'rgba(33, 37, 41, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        padding: '12px 0',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}
    >
      <Container fluid>
        <div className="d-flex justify-content-center align-items-center">
          <Button
            variant="outline-secondary"
            className="d-lg-none rounded-circle p-2 mr-2"
            onClick={mobileSidebarToggle}
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Menu size={20} />
          </Button>
          <Navbar.Brand
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{
              fontSize: '20px',
              fontWeight: '600',
              color: isDarkMode ? '#fff' : '#333',
              textDecoration: 'none'
            }}
          >
            {getBrandText()}
          </Navbar.Brand>
        </div>

        <Navbar.Toggle aria-controls="basic-navbar-nav">
          <span className="navbar-toggler-bar burger-lines"></span>
          <span className="navbar-toggler-bar burger-lines"></span>
          <span className="navbar-toggler-bar burger-lines"></span>
        </Navbar.Toggle>

        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mr-auto">
            {/* Barre de recherche moderne */}
            <Nav.Item className="d-none d-md-block">
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Search 
                  size={18} 
                  style={{
                    position: 'absolute',
                    left: '12px',
                    color: '#666',
                    zIndex: 1
                  }}
                />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  style={{
                    padding: '8px 12px 8px 40px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '25px',
                    width: '250px',
                    fontSize: '14px',
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    color: isDarkMode ? '#fff' : '#333',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.width = '300px';
                    e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.width = '250px';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </Nav.Item>
          </Nav>

          <Nav className="ml-auto d-flex align-items-center">
            {/* Toggle mode sombre */}
            <Nav.Item>
              <Button
                variant="link"
                onClick={toggleDarkMode}
                style={{
                  padding: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: isDarkMode ? '#ffd700' : '#666'
                }}
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </Button>
            </Nav.Item>

            {/* Notifications */}
            <Nav.Item>
              <Dropdown align="end">
                <Dropdown.Toggle
                  variant="link"
                  style={{
                    padding: '8px',
                    border: 'none',
                    background: 'transparent',
                    position: 'relative',
                    color: isDarkMode ? '#fff' : '#666'
                  }}
                >
                  <Bell size={20} />
                  {notifications > 0 && (
                    <Badge
                      bg="danger"
                      style={{
                        position: 'absolute',
                        top: '0',
                        right: '0',
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '10px'
                      }}
                    >
                      {notifications}
                    </Badge>
                  )}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{
                  minWidth: '300px',
                  padding: '0',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  borderRadius: '12px'
                }}>
                  <div style={{
                    padding: '16px',
                    borderBottom: '1px solid rgba(0,0,0,0.1)',
                    fontWeight: '600'
                  }}>
                    Notifications ({notifications})
                  </div>
                  <Dropdown.Item style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#667eea'
                      }} />
                      <div>
                        <div style={{ fontWeight: '500' }}>Nouvelle exposition</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Il y a 2 heures</div>
                      </div>
                    </div>
                  </Dropdown.Item>
                  <Dropdown.Item style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#28a745'
                      }} />
                      <div>
                        <div style={{ fontWeight: '500' }}>Paiement reçu</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Il y a 5 heures</div>
                      </div>
                    </div>
                  </Dropdown.Item>
                  <Dropdown.Item style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#ffc107'
                      }} />
                      <div>
                        <div style={{ fontWeight: '500' }}>Rappel réunion</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Demain à 10h</div>
                      </div>
                    </div>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Nav.Item>

            {/* Sélecteur de langue */}
            <Nav.Item>
              <Dropdown align="end">
                <Dropdown.Toggle
                  variant="link"
                  style={{
                    padding: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: isDarkMode ? '#fff' : '#666'
                  }}
                >
                  <Globe size={20} />
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item>🇫🇷 Français</Dropdown.Item>
                  <Dropdown.Item>🇬🇧 English</Dropdown.Item>
                  <Dropdown.Item>🇱🇰 සිංහල</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Nav.Item>

            {/* Profil utilisateur */}
            <Nav.Item>
              <Dropdown align="end">
                <Dropdown.Toggle
                  variant="link"
                  style={{
                    padding: '8px',
                    border: 'none',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: isDarkMode ? '#fff' : '#333'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#667eea',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '16px'
                  }}>
                    {getRoleIcon(userRole)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>
                      {localStorage.getItem("email") || "utilisateur@example.com"}
                    </span>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {getRoleIcon(userRole)} {userRole}
                    </span>
                  </div>
                </Dropdown.Toggle>
                <Dropdown.Menu style={{
                  minWidth: '200px',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  borderRadius: '12px'
                }}>
                  <Dropdown.Item onClick={() => history.push("/admin/user")}>
                    <User size={16} style={{ marginRight: '8px' }} />
                    Mon Profil
                  </Dropdown.Item>
                  <Dropdown.Item>
                    <Settings size={16} style={{ marginRight: '8px' }} />
                    Paramètres
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout} style={{ color: '#dc3545' }}>
                    <LogOut size={16} style={{ marginRight: '8px' }} />
                    Déconnexion
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Nav.Item>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AdminNavbar;
