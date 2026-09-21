import React, { useState, useEffect } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { Nav } from "react-bootstrap";
import { 
  Home, 
  User, 
  Settings, 
  LogOut, 
  Menu,
  X,
  ChevronDown,
  ChevronRight
} from "lucide-react";

function Sidebar({ color, image, routes }) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 993);
      if (window.innerWidth >= 993) {
        setIsCollapsed(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const activeRoute = (routeName) => {
    return location.pathname.indexOf(routeName) > -1 ? "active" : "";
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const groupedRoutes = routes.reduce((acc, route) => {
    if (route.redirect) return acc;
    
    let category = "Général";
    if (route.path.includes("user") || route.path.includes("profile")) category = "Compte";
    else if (route.path.includes("exhibition") || route.path.includes("stall")) category = "Expositions";
    else if (route.path.includes("register") || route.path.includes("approve")) category = "Administration";
    else if (route.path.includes("customize") || route.path.includes("avatar")) category = "Personnalisation";
    else if (route.path.includes("feedback") || route.path.includes("stat")) category = "Analytics";

    if (!acc[category]) acc[category] = [];
    acc[category].push(route);
    return acc;
  }, {});

  const getIcon = (iconClass) => {
    const iconMap = {
      "nc-icon nc-circle-09": <User size={20} />,
      "nc-icon nc-tv-2": <Home size={20} />,
      "nc-icon nc-button-play": <Settings size={20} />,
      "nc-icon nc-simple-add": <User size={20} />,
      "nc-icon nc-chat-round": <Settings size={20} />,
      "nc-icon nc-palette": <Settings size={20} />,
      "nc-icon nc-notes": <Settings size={20} />,
    };
    return iconMap[iconClass] || <Settings size={20} />;
  };

  return (
    <>
      {isMobile && !isCollapsed && (
        <div 
          onClick={() => setIsCollapsed(true)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }}
        />
      )}

      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: isCollapsed ? '-280px' : '0',
          width: '280px',
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          transition: 'all 0.3s ease',
          zIndex: 1000,
          boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
          overflowY: 'auto'
        }}
      >
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            color: 'white',
            fontSize: '18px',
            fontWeight: '600',
            opacity: isCollapsed ? 0 : 1,
            transition: 'opacity 0.3s ease'
          }}>
            Nerambum | නැරඹුම්
          </div>
          <button
            onClick={toggleSidebar}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              color: 'white',
              cursor: 'pointer',
              display: isMobile ? 'block' : 'none'
            }}
          >
            {isCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        <Nav style={{ padding: '20px 0', paddingBottom: '80px' }}>
          {Object.entries(groupedRoutes).map(([category, categoryRoutes]) => (
            <div key={category} style={{ marginBottom: '10px' }}>
              {!isCollapsed && (
                <div
                  onClick={() => toggleGroup(category)}
                  style={{
                    padding: '12px 20px',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  {category}
                  {expandedGroups[category] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              )}
              
              <div style={{
                maxHeight: (expandedGroups[category] !== false) ? '1000px' : '0',
                overflow: 'hidden',
                transition: 'max-height 0.3s ease'
              }}>
                {categoryRoutes.map((prop, key) => (
                  <li
                    key={key}
                    style={{
                      listStyle: 'none',
                      margin: '2px 10px',
                      borderRadius: '8px',
                      background: activeRoute(prop.layout + prop.path) ? 'rgba(255,255,255,0.15)' : 'transparent',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <NavLink
                      to={prop.layout + prop.path}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 15px',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.transform = 'translateX(5px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = activeRoute(prop.layout + prop.path) ? 'rgba(255,255,255,0.15)' : 'transparent';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <span style={{
                        marginRight: isCollapsed ? '0' : '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '24px'
                      }}>
                        {getIcon(prop.icon)}
                      </span>
                      {!isCollapsed && (
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '500'
                        }}>
                          {prop.name}
                        </span>
                      )}
                    </NavLink>
                  </li>
                ))}
              </div>
            </div>
          ))}
        </Nav>

        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '10px',
          right: '10px'
        }}>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.3s ease'
            }}
          >
            <LogOut size={18} />
            {!isCollapsed && 'Déconnexion'}
          </button>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
