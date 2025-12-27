import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api.js";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../styles/calendar.css';

export default function CalendarPage() {
  const nav = useNavigate();
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    scheduled_at: "",
    description: "",
    maintenance_for: ""
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const list = await apiGet("/requests");
      setEvents(list.filter(x => x.scheduled_at));
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // In a real app, you would call apiPost here
      // await apiPost("/requests", formData);
      
      // For demo purposes, we'll just add it to the local state
      const newEvent = {
        id: Date.now(),
        ...formData,
        stage: "SCHEDULED",
        created_at: new Date().toISOString()
      };
      
      setEvents(prev => [...prev, newEvent]);
      setIsModalOpen(false);
      setFormData({
        subject: "",
        scheduled_at: "",
        description: "",
        maintenance_for: ""
      });
    } catch (error) {
      console.error("Error creating event:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const [view, setView] = useState('calendar'); // 'calendar' or 'list'
  const [date, setDate] = useState(new Date());

  // Filter events for the selected date in calendar view
  const selectedDateEvents = events.filter(event => {
    const eventDate = new Date(event.scheduled_at);
    return eventDate.toDateString() === date.toDateString();
  });

  // Custom tile content for the calendar
  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    
    const dateEvents = events.filter(event => {
      const eventDate = new Date(event.scheduled_at);
      return eventDate.toDateString() === date.toDateString();
    });

    return (
      <div className="calendar-day">
        {dateEvents.length > 0 && (
          <div className="event-dot" />
        )}
      </div>
    );
  };

  // Format date for display in the list
  const formatDate = (dateString) => {
    const options = { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <div>
      <div className="topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="topbar-title">Maintenance Calendar</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button 
            variant={view === 'calendar' ? 'primary' : 'secondary'}
            onClick={() => setView('calendar')}
          >
            Calendar View
          </Button>
          <Button 
            variant={view === 'list' ? 'primary' : 'secondary'}
            onClick={() => setView('list')}
          >
            List View
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>+ Add Event</Button>
        </div>
      </div>
      
      <div className="content-wrapper">
        {view === 'calendar' ? (
          <div className="calendar-container">
            <div className="calendar-wrapper">
              <Calendar
                onChange={setDate}
                value={date}
                tileContent={tileContent}
                className="custom-calendar"
                onClickDay={(value) => {
                  setDate(value);
                  setView('list');
                }}
              />
            </div>
            
            <div className="calendar-events">
              <h3>Events for {date.toDateString()}</h3>
              {selectedDateEvents.length > 0 ? (
                <div className="event-list">
                  {selectedDateEvents.map(event => (
                    <div 
                      key={event.id} 
                      className="event-item"
                      onClick={() => nav(`/requests?open=${event.id}`)}
                    >
                      <div className="event-time">
                        {new Date(event.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <div className="event-details">
                        <div className="event-title">{event.subject}</div>
                        {event.maintenance_for && (
                          <div className="event-type">{event.maintenance_for}</div>
                        )}
                      </div>
                      <div className={`event-status ${event.stage.toLowerCase().replace('_', '-')}`}>
                        {event.stage.replace('_', ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No events scheduled for this day.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <div className="table-header">
              <h3>All Scheduled Events</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Scheduled At</th>
                  <th>Stage</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event.id} onClick={() => nav(`/requests?open=${event.id}`)} style={{ cursor: "pointer" }}>
                    <td>{event.subject}</td>
                    <td>{formatDate(event.scheduled_at)}</td>
                    <td>
                      <span className={`status-badge ${event.stage.toLowerCase().replace('_', '-')}`}>
                        {event.stage.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{event.maintenance_for || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Event">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Subject *</label>
            <Input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              required
              placeholder="Enter event subject"
            />
          </div>
          
          <div className="form-group">
            <label>Scheduled Date & Time *</label>
            <Input
              type="datetime-local"
              name="scheduled_at"
              value={formData.scheduled_at}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Maintenance For</label>
            <Input
              type="text"
              name="maintenance_for"
              value={formData.maintenance_for}
              onChange={handleInputChange}
              placeholder="E.g., Server Room AC"
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-control"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              placeholder="Enter event details"
            />
          </div>
          
          <div className="form-actions" style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Save Event
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
