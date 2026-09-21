import React from 'react';
import { Card, Container, Row, Col, Button, Badge, Alert } from 'react-bootstrap';
import { Sparkles, Palette, Moon, Sun, Search, Bell, Globe } from 'lucide-react';

function MenuDemo() {
  return (
    <Container fluid className="p-4">
      <Alert variant="info" className="mb-4">
        <Sparkles size={20} className="me-2" />
        <strong>Nouvelle interface de menu !</strong> Découvrez les améliorations apportées à la navigation.
      </Alert>

      <Row>
        <Col md={6} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-gradient text-white" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <Palette size={24} className="me-2" />
              Sidebar Moderne
            </Card.Header>
            <Card.Body>
              <h5>Fonctionnalités :</h5>
              <ul>
                <li>🎨 Design avec gradient violet/bleu</li>
                <li>📱 Navigation groupée par catégories</li>
                <li>✨ Animations fluides au survol</li>
                <li>📱 Responsive avec overlay mobile</li>
                <li>🎯 Icônes Lucide React modernes</li>
                <li>🔴 Indicateur de route active</li>
              </ul>
              <Badge bg="success" className="mt-3">✅ Implémenté</Badge>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-gradient text-white" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
              <Search size={24} className="me-2" />
              Navbar Moderne
            </Card.Header>
            <Card.Body>
              <h5>Fonctionnalités :</h5>
              <ul>
                <li>🔍 Barre de recherche animée</li>
                <li>🌙 Mode sombre/clair persistant</li>
                <li>🔔 Notifications avec badge</li>
                <li>🌍 Sélecteur de langue</li>
                <li>👤 Profil utilisateur dropdown</li>
                <li>✨ Effet de transparence blur</li>
              </ul>
              <Badge bg="success" className="mt-3">✅ Implémenté</Badge>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={12} className="mb-4">
          <Card>
            <Card.Header className="bg-gradient text-white" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
              <Moon size={24} className="me-2" />
              Mode Sombre
            </Card.Header>
            <Card.Body>
              <h5>Caractéristiques :</h5>
              <Row>
                <Col md={6}>
                  <ul>
                    <li>🌙 Toggle dans la navbar</li>
                    <li>💾 Persistance localStorage</li>
                    <li>🎨 Tous les composants adaptés</li>
                    <li>⚡ Transitions fluides</li>
                  </ul>
                </Col>
                <Col md={6}>
                  <ul>
                    <li>🎯 Contraste optimisé</li>
                    <li>📱 Responsive design</li>
                    <li>♿ Accessibilité améliorée</li>
                    <li>🚀 Performance optimisée</li>
                  </ul>
                </Col>
              </Row>
              <Badge bg="success" className="mt-3">✅ Implémenté</Badge>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          <Card>
            <Card.Header className="bg-gradient text-white" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
              <Globe size={24} className="me-2" />
              Améliorations Globales
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <h6>🎨 Design</h6>
                  <ul className="list-unstyled">
                    <li>• Variables CSS cohérentes</li>
                    <li>• Animations professionnelles</li>
                    <li>• Effets de survol</li>
                    <li>• Scrollbar personnalisée</li>
                  </ul>
                </Col>
                <Col md={4}>
                  <h6>📱 Responsive</h6>
                  <ul className="list-unstyled">
                    <li>• Mobile-first approach</li>
                    <li>• Breakpoints optimisés</li>
                    <li>• Touch-friendly</li>
                    <li>• Adaptive layouts</li>
                  </ul>
                </Col>
                <Col md={4}>
                  <h6>♿ Accessibilité</h6>
                  <ul className="list-unstyled">
                    <li>• Focus visible</li>
                    <li>• Reduced motion</li>
                    <li>• ARIA labels</li>
                    <li>• Keyboard navigation</li>
                  </ul>
                </Col>
              </Row>
              <div className="text-center mt-4">
                <Button variant="primary" size="lg" className="me-2">
                  <Sparkles size={18} className="me-2" />
                  Interface Modernisée
                </Button>
                <Button variant="outline-primary" size="lg">
                  Voir le code
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default MenuDemo;
