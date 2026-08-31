import React, { useState } from 'react';
import { CourseCard } from '../components/CourseCard';
import { sampleCourses, Course } from '../data/sampleData';
import { BookOpen } from 'lucide-react';
import './ClassroomPage.css';

export const ClassroomPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'SALES' | 'CONTENT' | 'OFFER'>('ALL');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const filteredCourses = activeCategory === 'ALL'
    ? sampleCourses
    : sampleCourses.filter(c => c.category === activeCategory);

  const salesCourses = sampleCourses.filter(c => c.category === 'SALES');
  const contentCourses = sampleCourses.filter(c => c.category === 'CONTENT');
  const offerCourses = sampleCourses.filter(c => c.category === 'OFFER');

  return (
    <div className="classroom-page">
      {/* Classroom Header */}
      <div className="classroom-header-section">
        <div className="classroom-title-group">
          <div className="classroom-badge">
            <BookOpen size={13} />
            <span>OPERATOR CURRICULUM</span>
          </div>
          <h1 className="page-title">CLASSROOM</h1>
          <p className="page-subtitle">Learn it. Apply it. Build with it.</p>
        </div>

        {/* Category Filter Pills */}
        <div className="category-filter-pills">
          <button
            className={`pill-btn ${activeCategory === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveCategory('ALL')}
          >
            All Tracks ({sampleCourses.length})
          </button>
          <button
            className={`pill-btn ${activeCategory === 'SALES' ? 'active' : ''}`}
            onClick={() => setActiveCategory('SALES')}
          >
            Sales ({salesCourses.length})
          </button>
          <button
            className={`pill-btn ${activeCategory === 'CONTENT' ? 'active' : ''}`}
            onClick={() => setActiveCategory('CONTENT')}
          >
            Content ({contentCourses.length})
          </button>
          <button
            className={`pill-btn ${activeCategory === 'OFFER' ? 'active' : ''}`}
            onClick={() => setActiveCategory('OFFER')}
          >
            Offer ({offerCourses.length})
          </button>
        </div>
      </div>

      {/* Course Grid Area */}
      {activeCategory === 'ALL' ? (
        <div className="classroom-category-sections">
          {/* Section 1: SALES */}
          <div className="category-section">
            <div className="category-section-header">
              <h2 className="category-title">SALES</h2>
              <span className="category-track-count">{salesCourses.length} Modules</span>
            </div>
            <div className="courses-grid">
              {salesCourses.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onClick={(c) => setSelectedCourse(c)}
                />
              ))}
            </div>
          </div>

          {/* Section 2: CONTENT */}
          <div className="category-section">
            <div className="category-section-header">
              <h2 className="category-title">CONTENT</h2>
              <span className="category-track-count">{contentCourses.length} Modules</span>
            </div>
            <div className="courses-grid">
              {contentCourses.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onClick={(c) => setSelectedCourse(c)}
                />
              ))}
            </div>
          </div>

          {/* Section 3: OFFER */}
          <div className="category-section">
            <div className="category-section-header">
              <h2 className="category-title">OFFER</h2>
              <span className="category-track-count">{offerCourses.length} Modules</span>
            </div>
            <div className="courses-grid">
              {offerCourses.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onClick={(c) => setSelectedCourse(c)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="courses-grid single-category-grid">
          {filteredCourses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              onClick={(c) => setSelectedCourse(c)}
            />
          ))}
        </div>
      )}

      {/* Lightweight Course Preview Modal / Drawer for interactive feel */}
      {selectedCourse && (
        <div className="course-modal-backdrop" onClick={() => setSelectedCourse(null)}>
          <div className="course-modal-card skool-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top-thumb">
              <img src={selectedCourse.thumbnail} alt={selectedCourse.title} />
            </div>
            <div className="modal-body">
              <div className="modal-cat-tag">{selectedCourse.category} MODULE</div>
              <h2 className="modal-title">{selectedCourse.title}</h2>
              <p className="modal-subtitle">{selectedCourse.subtitle}</p>
              
              <div className="modal-progress-box">
                <div className="progress-info-row">
                  <span>Current Completion: {selectedCourse.progress}%</span>
                  <span>{selectedCourse.completedLessons} / {selectedCourse.totalLessons} Lessons Done</span>
                </div>
                <div className="modal-track">
                  <div
                    className="modal-fill"
                    style={{ width: `${selectedCourse.progress}%` }}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="btn btn-primary btn-lg full-w"
                  onClick={() => setSelectedCourse(null)}
                >
                  RESUME MODULE
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedCourse(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
