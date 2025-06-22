function CourseCard({ course, selected, preference, enrollmentCount, onSelect }) {
  const isLowEnrollment = enrollmentCount < 20;
  
  return (
    <div 
      className={`
        group relative p-4 sm:p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg
        ${selected 
          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md transform scale-105' 
          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md hover:transform hover:scale-102'
        }
      `}
      onClick={onSelect}
    >
      {/* Selection Badge */}
      {selected && (
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg z-10">
          <span className="text-sm font-bold">{preference}</span>
        </div>
      )}

      {/* Course Content */}
      <div className="space-y-3">
        {/* Course Header */}
        <div>
          <h4 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight mb-1 group-hover:text-blue-600 transition-colors">
            {course.name}
          </h4>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <p className="text-xs sm:text-sm text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
              {course.id}
            </p>
            <div className="flex items-center gap-1">
              <span className="text-yellow-500 text-sm">⭐</span>
              <span className="text-xs sm:text-sm text-gray-600 font-medium">
                {course.credits} credits
              </span>
            </div>
          </div>
        </div>
        
        {/* Enrollment Info */}
        {enrollmentCount !== undefined && (
          <div className="flex items-center justify-between">
            <span className={`
              text-xs px-2 py-1 rounded-full font-medium
              ${isLowEnrollment 
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
                : 'bg-green-100 text-green-800 border border-green-200'
              }
            `}>
              {enrollmentCount} enrolled
            </span>
            {isLowEnrollment && (
              <span className="text-xs text-yellow-600">⚠️ Limited</span>
            )}
          </div>
        )}

        {/* Selection Indicator */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full transition-colors ${
              selected ? 'bg-blue-500' : 'bg-gray-300'
            }`}></div>
            <span className="text-xs text-gray-500">
              {selected ? `Choice ${preference}` : 'Click to select'}
            </span>
          </div>
          
          {selected && (
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      {/* Hover Effect */}
      <div className={`absolute inset-0 rounded-xl transition-opacity ${
        selected ? 'opacity-0' : 'opacity-0 group-hover:opacity-5 bg-blue-500'
      }`}></div>
    </div>
  );
}

export default CourseCard;