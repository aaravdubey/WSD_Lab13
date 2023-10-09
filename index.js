const mysql = require('mysql2');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

//Assuming that the tables (reservations & rooms) are created and some data is stored in the tables (Created & inserted using MySql Command line client since not a part of question)
const dbConfig = {
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: 'root',
  database: 'hotel_reservation'
};

const connection = mysql.createConnection(dbConfig);

app.post('/search-rooms', async (req, res) => {
  try {
    const { checkInDate, checkOutDate, roomType, occupancy } = req.body;
    // console.log(req.body);

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(checkInDate) || !dateRegex.test(checkOutDate)) {
      return res.status(400).json({ error: 'Invalid date format. Please use yyyy-mm-dd.' });
    }

    if (roomType != 'Single' && roomType != 'Double') {
      return res.status(400).json({ error: 'Invalid room type. Please specify Single or Double.' });
    }

    if (isNaN(parseInt(occupancy)) || occupancy <= 0) {
      return res.status(400).json({ error: 'Invalid occupancy. Please specify a valid number greater than 0.' });
    }

    const availableRooms = await findAvailableRooms(checkInDate, checkOutDate, roomType, occupancy);

    if( availableRooms.length > 0 ) res.status(200).json({ message: "Room(s) found", availableRooms })
    else res.status(404).json({ message: "No suitable room found" })

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});


function findAvailableRooms(checkInDate, checkOutDate, roomType, occupancy) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * 
      FROM rooms 
      WHERE room_type = ? 
      AND occupancy >= ? 
      AND room_id NOT IN (
        SELECT room_id 
        FROM reservations 
        WHERE (check_in_date <= ? AND check_out_date >= ?) 
        OR (check_in_date >= ? AND check_in_date < ?) 
        OR (check_out_date > ? AND check_out_date <= ?)
      )
    `;

    connection.query(
      query,
      [roomType, occupancy, checkInDate, checkOutDate, checkInDate, checkOutDate, checkInDate, checkOutDate],
      (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      }
    );
  });
}
