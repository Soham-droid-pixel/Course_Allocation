function CourseCard({ course, onSelect, selected, preference }) {
  return (
    <div 
      className={`p-4 border rounded-lg cursor-pointer transition-all ${
        selected ? 'border-primary bg-blue-50' : 'border-gray-200'
      }`}
      onClick={() => onSelect(course)}
    >
      <h3 className="font-semibold text-lg">{course.name}</h3>
      <p className="text-gray-600">Available Seats: {course.seats}</p>
      {preference && (
        <div className="mt-2">
          <span className="text-sm text-primary">
            Preference: {preference}
          </span>
        </div>
      )}
    </div>
  )
}

export default CourseCard