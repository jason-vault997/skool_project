import React from 'react';
import { ProgressBar } from './ProgressBar';
import { Lock } from 'lucide-react';
import './CourseCard.css';

export interface Course {
  id: string;
  category: 'SALES' | 'CONTENT' | 'OFFER';
  title: string;
  subtitle: string;
  thumbnail: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  locked?: boolean;
}

interface CourseCardProps {
  course: Course;
  onClick?: (course: Course) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, onClick }) => {
  return (
    <div
      className="course-card skool-card skool-card-interactive"
      onClick={() => onClick && onClick(course)}
      role="button"
      tabIndex={0}
    >
      {/* Thumbnail Container */}
      <div className="course-thumbnail-wrapper">
        <img
          src={course.thumbnail}
          alt={course.title}
          className="course-thumbnail-img"
          loading="lazy"
        />
        {course.locked && (
          <div className="course-lock-overlay">
            <Lock size={20} className="lock-icon" />
            <span className="lock-text">Locked</span>
          </div>
        )}
      </div>

      {/* Course Content */}
      <div className="course-card-body">
        <div className="course-card-header">
          <h3 className="course-title">{course.title}</h3>
          {course.subtitle && <p className="course-subtitle">{course.subtitle}</p>}
        </div>

        {/* Progress Section */}
        <div className="course-card-footer">
          <ProgressBar
            value={course.progress}
            color={course.progress > 0 ? "var(--brand-lime)" : "transparent"}
            trackColor="#e5e7eb"
            height={7}
            showPercent={false}
          />
          <div className="course-percent-label">
            <span>{course.progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
