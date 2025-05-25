function CourseCard({ course, selected, preference, enrollmentCount, onSelect }) {
  const isLowEnrollment = enrollmentCount < 20;
  
  return (
    <div 
      className={`
        p-4 rounded-lg border-2 cursor-pointer transition-all
        ${selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}
      `}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium">{course.name}</h4>
          <p className="text-sm text-gray-600">{course.id}</p>
          <p className="text-sm text-gray-600">Credits: {course.credits}</p>
          
          {enrollmentCount !== undefined && (
            <div className="mt-2">
              <span className={`
                text-sm px-2 py-1 rounded-full
                ${isLowEnrollment ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}
              `}>
                {enrollmentCount} enrolled
              </span>
            </div>
          )}
        </div>
        
        {selected && (
          <span className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center">
            {preference}
          </span>
        )}
      </div>
    </div>
  );
}

export default CourseCard;