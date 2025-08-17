/*SimpleConfirm is a component to quickly confirm a preference for the logged-in user.

It gets the current user from useAuth and shows their roll number.

When the “CONFIRM NOW” button is clicked:

It sends a POST request to the API with confirm: true and the user’s auth token.

If the request succeeds, it shows a success toast; otherwise, it shows an error toast.

Basically, it’s a simple one-click action to confirm something on the backend and give instant feedback.*/
import React from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

function SimpleConfirm() {
  const { user } = useAuth();

  const confirmNow = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:8000/api/preferences/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ confirm: true })
      });
      
      if (response.ok) {
        toast.success('CONFIRMED!');
        console.log('SUCCESS - Status changed to confirmed');
      } else {
        toast.error('Failed');
      }
    } catch (error) {
      toast.error('Error');
      console.error(error);
    }
  };

  return (
    <div className="p-6">
      <h2>Quick Confirm</h2>
      <p>Student: {user?.roll_number}</p>
      <button 
        onClick={confirmNow}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        CONFIRM NOW
      </button>
    </div>
  );
}

export default SimpleConfirm;