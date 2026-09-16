import React, { useState, useEffect } from "react";
import { Card, Container, Row, Col, Button } from "react-bootstrap";
import axios from "axios";

export default function StartExhibitions({ data }) {
  const [exhibitions, setExhibitions] = useState(data || []);
  const [loading, setLoading] = useState(!data);

  const fetchExhibitions = () => {
    axios
      .get("http://localhost:8080/api/exhibitions", {
        headers: {
          Authorization: localStorage.getItem("jwt") || "",
        },
      })
      .then((res) => {
        setExhibitions(res.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!data) {
      fetchExhibitions();
    } else {
      setExhibitions(data);
    }
  }, [data]);

  function handleStart(id) {
    axios
      .put(`http://localhost:8080/api/exhibitions/${id}/start?start=true`, {}, {
        headers: {
          Authorization: localStorage.getItem("jwt") || "",
        },
      })
      .then(() => {
        fetchExhibitions();
      });
  }

  function handleEnd(id) {
    axios
      .put(`http://localhost:8080/api/exhibitions/${id}/start?start=false`, {}, {
        headers: {
          Authorization: localStorage.getItem("jwt") || "",
        },
      })
      .then(() => {
        fetchExhibitions();
      });
  }

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col md="12">
          <Card className="strpied-tabled-with-hover">
            <Card.Header>
              <Card.Title as="h4">Manage & Start Exhibitions</Card.Title>
              <p className="card-category">
                Control active live status and admit attendees to your virtual 3D exhibitions.
              </p>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">Loading exhibitions...</div>
              ) : exhibitions.length === 0 ? (
                <div className="text-center py-4">No exhibitions found.</div>
              ) : (
                <Row>
                  {exhibitions.map((item, idx) => (
                    <Col md="4" sm="6" key={item.id || idx} className="mb-4">
                      <Card className="h-100 shadow-sm border">
                        <Card.Body>
                          <div className="d-flex align-items-center mb-3">
                            <img
                              src="https://img.icons8.com/external-smashingstocks-isometric-smashing-stocks/55/null/external-Exhibition-art-and-culture-smashingstocks-isometric-smashing-stocks.png"
                              alt="icon"
                              style={{ width: "40px", height: "40px", marginRight: "12px" }}
                            />
                            <div>
                              <h5 className="m-0 font-weight-bold">{item.exhibitionName}</h5>
                              <small className="text-muted">{item.category || "General"}</small>
                            </div>
                          </div>
                          <p className="card-text text-secondary mb-2" style={{ fontSize: "14px" }}>
                            {item.description}
                          </p>
                          <hr />
                          <div className="small mb-2">
                            <strong>Date:</strong> {item.date || item.datetime || "Upcoming"}
                          </div>
                          <div className="small mb-2">
                            <strong>Ticket Price:</strong> ${item.ticketPrice || 0}
                          </div>
                          <div className="small mb-3">
                            <strong>Status:</strong>{" "}
                            {item.started ? (
                              <span className="badge badge-success">Running / Live</span>
                            ) : (
                              <span className="badge badge-warning text-dark">Scheduled / Stopped</span>
                            )}
                          </div>

                          <div className="text-center mt-3">
                            {!item.started ? (
                              <Button
                                variant="success"
                                className="btn-fill w-100"
                                onClick={() => handleStart(item.id)}
                              >
                                <i className="nc-icon nc-button-play mr-2"></i> Start Exhibition
                              </Button>
                            ) : (
                              <Button
                                variant="danger"
                                className="btn-fill w-100"
                                onClick={() => handleEnd(item.id)}
                              >
                                <i className="nc-icon nc-button-power mr-2"></i> Stop Exhibition
                              </Button>
                            )}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
