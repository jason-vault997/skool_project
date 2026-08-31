import React, { useState, useEffect } from 'react';
import { CourseCard } from '../components/CourseCard';
import { useAuth } from '../lib/auth/AuthContext';
import { getAllModulesWithProgress } from '../lib/data/modules';
import type { ModuleWithProgress } from '../lib/supabase/types';
import { BookOpen } from 'lucide-react';
import './ClassroomPage.css';

// Shape expected by CourseCard — we map ModuleWithProgress → this
interface CourseCardData {
  id: string;
  category: 'SALES' | 'CONTENT' | 'OFFER';
  title: string;
  subtitle: string;
  thumbnail: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
}

const TRACK_SLUG_TO_CATEGORY: Record<string, 'SALES' | 'CONTENT' | 'OFFER'> = {
  sales: 'SALES',
  content: 'CONTENT',
  offer: 'OFFER',
};

const DEFAULT_THUMBNAILS: Record<string, string> = {
  sales: '/assets/course-sales.png',
  content: '/assets/course-content.png',
  offer: '/assets/course-offer.png',
};

function mapModuleToCourse(mod: ModuleWithProgress): CourseCardData {
  const category = TRACK_SLUG_TO_CATEGORY[mod.trackSlug] ?? 'SALES';
  const thumbnail = mod.thumbnail_url ?? DEFAULT_THUMBNAILS[mod.trackSlug] ?? '/assets/course-sales.png';
  return {
    id: mod.id,
    category,
    title: mod.title,
    subtitle: mod.description ?? '',
    thumbnail,
    progress: mod.progress,
    totalLessons: mod.totalLessons,
    completedLessons: mod.completedLessons,
  };
}

export const ClassroomPage: React.FC = () => {
  const { user } = useAuth();
  const [modules, setModules] = useState<ModuleWithProgress[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'SALES' | 'CONTENT' | 'OFFER'>('ALL');
  const [selectedCourse, setSelectedCourse] = useState<CourseCardData | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoadingData(true);
    getAllModulesWithProgress(user.id)
      .then((data) => {
        setModules(data);
        setError(null);
      })
      .catch(() => setError('Could not load curriculum. Please try again.'))
      .finally(() => setLoadingData(false));
  }, [user]);

  const courses: CourseCardData[] = modules.map(mapModuleToCourse);

  const salesCourses   = courses.filter(c => c.category === 'SALES');
  const contentCourses = courses.filter(c => c.category === 'CONTENT');
  const offerCourses   = courses.filter(c => c.category === 'OFFER');

  const filteredCourses = activeCategory === 'ALL'
    ? courses
    : courses.filter(c => c.category === activeCategory);

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
          <button className={`pill-btn ${activeCategory === 'ALL' ? 'active' : ''}`} onClick={() => setActiveCategory('ALL')}>
            All Tracks ({courses.length})
          </button>
          <button className={`pill-btn ${activeCategory === 'SALES' ? 'active' : ''}`} onClick={() => setActiveCategory('SALES')}>
            Sales ({salesCourses.length})
          </button>
          <button className={`pill-btn ${activeCategory === 'CONTENT' ? 'active' : ''}`} onClick={() => setActiveCategory('CONTENT')}>
            Content ({contentCourses.length})
          </button>
          <button className={`pill-btn ${activeCategory === 'OFFER' ? 'active' : ''}`} onClick={() => setActiveCategory('OFFER')}>
            Offer ({offerCourses.length})
          </button>
        </div>
      </div>

      {/* Loading */}
      {loadingData && (
        <div className="data-loading-state">
          <div className="skeleton-line" style={{ width: '60%', margin: '0 auto 8px' }} />
          <div className="skeleton-line" style={{ width: '40%', margin: '0 auto' }} />
        </div>
      )}

      {/* Error */}
      {!loadingData && error && (
        <div className="data-error-state">
          <strong>Unable to load curriculum</strong>
          {error}
        </div>
      )}

      {/* Empty state — migration not yet run */}
      {!loadingData && !error && courses.length === 0 && (
        <div className="data-empty-state">
          <strong>No modules available yet</strong>
          Run the Supabase migration to seed curriculum data.
        </div>
      )}

      {/* Course Grid */}
      {!loadingData && !error && courses.length > 0 && (
        activeCategory === 'ALL' ? (
          <div className="classroom-category-sections">
            {[{ label: 'SALES', items: salesCourses }, { label: 'CONTENT', items: contentCourses }, { label: 'OFFER', items: offerCourses }]
              .filter(sec => sec.items.length > 0)
              .map(sec => (
                <div key={sec.label} className="category-section">
                  <div className="category-section-header">
                    <h2 className="category-title">{sec.label}</h2>
                    <span className="category-track-count">{sec.items.length} Modules</span>
                  </div>
                  <div className="courses-grid">
                    {sec.items.map(course => (
                      <CourseCard key={course.id} course={course} onClick={(c) => setSelectedCourse(c)} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="courses-grid single-category-grid">
            {filteredCourses.map(course => (
              <CourseCard key={course.id} course={course} onClick={(c) => setSelectedCourse(c)} />
            ))}
          </div>
        )
      )}

      {/* Course Preview Modal */}
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
                  <div className="modal-fill" style={{ width: `${selectedCourse.progress}%` }} />
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn btn-primary btn-lg full-w" onClick={() => setSelectedCourse(null)}>
                  RESUME MODULE
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedCourse(null)}>
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
