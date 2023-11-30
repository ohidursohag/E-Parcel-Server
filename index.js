const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000
const app = express();

// middleware
app.use(cors({
   origin: [
      "http://localhost:5173",
      "https://e-parcel-f5214.web.app"
   ],
   credentials: true,
}));
app.use(express.json());
app.use(cookieParser())

// Verify Access Token
const verifyToken = async (req, res, next) => {
   const accessToken = req.cookies?.accessToken;
   // console.log('Value of Access Token in MiddleWare -------->', accessToken);
   if (!accessToken) {
      return res.status(401).send({ message: 'UnAuthorized Access', code: 401 });
   }
   jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
      if (error) {
         return res.status(401).send({ message: 'UnAuthorized Access', code: 401 });
      }
      req.user = decoded;

      next();
   })
}

// Verify Admin
const verifyAdmin = async (req, res, next) => {
   const email = req.user?.email
   const query = { email: email };
   const user = await userCollection.findOne(query);
   const isAdmin = user?.role === 'admin';
   if (!isAdmin) {
      return res.status(403).send({ message: 'Forbidden Access', code: 403 });
   }
   next();
}

const uri = process.env.MONGO_DB_URI;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
   serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
   }
});
async function run() {
   try {
      // Connect the client to the server	(optional starting in v4.7)
      // client.connect();
      // Send a ping to confirm a successful connection
      client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
   } finally {
      // Ensures that the client will close when you finish/error
      // await client.close();
   }
}
run().catch(console.dir);

// Database Collection
const userCollection = client.db('eParcelDB').collection('users');
const parcelBookingCollection = client.db('eParcelDB').collection('parcelBookings');
const reviewsCollection = client.db('eParcelDB').collection('reviews');




// JWT:: Create Access token 
app.post('/e-parcel/api/v1/auth/access-token', async (req, res) => {
   const user = req.body;
   console.log('Requested access token User ------>', user);
   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: '10d',
   })
   res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
   }).send({ success: true });
})

// Clear access token when user logged out
app.get('/e-parcel/api/v1/logout', async (req, res) => {
   try {
      res.clearCookie('accessToken', {
         maxAge: 0,
         secure: process.env.NODE_ENV === 'production',
         sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
      }).send({ success: true });
   } catch (error) {
      return res.send({ error: true, error: error.message });
   }
})

// --------- User Collection Apis ---------
// Save or modify user  user info when register / google login
app.put('/e-parcel/api/v1/create-or-update-user/:email', verifyToken, async (req, res) => {
   try {
      const email = req.params.email;
      const user = req.body;
      if (email !== req.user?.email) {
         return res.status(403).send({ message: 'Forbidden Access', code: 403 });
      }
      // console.log(user);
      const query = { email: email };
      const option = { upsert: true };
      const isExist = await userCollection.findOne(query);
      const updateDoc = {
         $set: { ...user }
      }
      // console.log(updateDoc);
      // console.log('User found?----->', isExist)
      if (isExist) {
         return res.send('User Alredy exist ------>')
      }
      const result = await userCollection.updateOne(query, updateDoc, option);
      console.log('user updated?----->');
      return res.send(result);
   } catch (error) {
      return res.send({ error: true, message: error.message });
   }
})
// Get all users data api 
// {ToDo verifyAdmin }
app.get('/e-parcel/api/v1/all-users', verifyToken, verifyAdmin, async (req, res) => {
   try {
      let queryObj = {};
      // filtering
      const role = req.query?.role;
      if (role) {
         queryObj.role = role;
      }
      const result = await userCollection.find(queryObj).toArray()
      return res.send(result)
   } catch (error) {
      return res.send({ error: true, message: error.message });
   }
})
// update User data api
app.patch('/e-parcel/api/v1/update-user-data/:id', verifyToken, async (req, res) => {
   try {
      console.log('user updated?----->');
      const { id } = req.params;
      const updateUserData = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
         $set: { ...updateUserData }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      return res.send(result);
   } catch (error) {
      return res.send({ error: true, message: error.message });
   }
})

// get single user data by email 
app.get('/e-parcel/api/v1/get-user-data/:email', verifyToken, async (req, res) => {
   try {
      const email = req.params.email;
      if (email !== req.user?.email) {
         return res.status(403).send({ message: 'Forbidden Access', code: 403 })
      }
      const query = { email: email };
      const result = await userCollection.findOne(query);
      //   console.log('user data -------->',result);
      return res.send(result);
   } catch (error) {
      return res.send({ error: true, message: error.message });
   }
})

// get single user data by id 
app.get('/e-parcel/api/v1/get-user-data/:id', verifyToken, async (req, res) => {
   try {
      const id = req.params.id;
      if (email !== req.user?.email) {
         return res.status(403).send({ message: 'Forbidden Access', code: 403 })
      }
      const query = { email: email };
      const result = await userCollection.findOne(query);
      //   console.log('user data -------->',result);
      return res.send(result);
   } catch (error) {
      return res.send({ error: true, message: error.message });
   }
})

// -------- Parcel Booking Collection Apis--------------
// Add booked Parcel 
app.post('/e-parcel/api/v1/book-parcel', verifyToken, async (req, res) => {
   try {
      const bookingData = req.body;
      const result = await parcelBookingCollection.insertOne(bookingData);
      return res.send(result);
   } catch (error) {
      return res.send({ error: true, message: error.message });
   }
})
// Get All Parcel Bookings data
app.get('/e-parcel/api/v1/all-bookings-data', verifyToken, async (req, res) => {
   try {
      let queryObj = {};
      console.log('hit request ------>');
      // filtering
      const deliveryManId = req.query?.deliveryManId;
      // console.log(req.query);
      if (deliveryManId ) {
         queryObj.deliveryManId = deliveryManId;
      }
      // console.log(queryObj);
      console.log(deliveryManId);
      const result = await parcelBookingCollection.find(queryObj).toArray();
      // console.log(result);
      return res.send(result);
   } catch (error) {
      console.log(error);
      return res.send({ error: true, message: error.message });
   }
})

// Get Single booking data by Id
app.get('/e-parcel/api/v1/booking-data/:id', async (req, res) => {
   try {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await parcelBookingCollection.findOne(query);
      return res.send(result);
   } catch (error) {
      return res.send({ error: true, message: error.message });
   }
})

// Get user specific  bookings data by email address 
app.get('/e-parcel/api/v1/user-booking-data/:email', verifyToken, async (req, res) => {
   try {
      const { email } = req.params;
      if (email !== req.user?.email) {
         return res.status(403).send({ message: 'Forbidden Access', code: 403 })
      }
      const query = { senderEmail: email };
      const result = await parcelBookingCollection.find(query).toArray();
      return res.send(result);
   } catch (error) {
      return res.send({ error: true, message: error.message });
   }
})

// Change/update bookings data
app.patch('/e-parcel/api/v1/update-booking-data/:id', verifyToken, async (req, res) => {
   try {
      const { id } = req.params;
      const updateBookingData = req.body
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
         $set: { ...updateBookingData }
      }
      const result = await parcelBookingCollection.updateOne(filter, updatedDoc)
      return res.send(result);
   } catch (error) {
      return res.send({ error: true, message: error.message });
   }
})


// ------------ Reviews collection Apis ------------>
// Add Review
app.post('/e-parcel/api/v1/add-review', verifyToken, async (req, res) => {
   try {
      const reviewData = req.body;
      const result = await reviewsCollection.insertOne(reviewData);
      return res.send(result);
   } catch (error) {
      return res.send({ error: true, message: error.message });
   }
})

// Get All review  data
app.get('/e-parcel/api/v1/all-Review-data', verifyToken, async (req, res) => {
   try {
      console.log('hit request ------>');
      let queryObj = {};
      // filtering
      const deliveryManId = req.query?.deliveryManId;
      console.log(req.query);
      if (deliveryManId) {
         queryObj.deliveryManId = deliveryManId;
      }
      // console.log(queryObj);
      console.log(deliveryManId);
      const result = await reviewsCollection.find(queryObj).toArray();
      // console.log(result);
      return res.send(result);
   } catch (error) {
      console.log(error);
      return res.send({ error: true, message: error.message });
   }
})

// Test Api
app.get('/', (req, res) => {
   res.send('Server is Running');
})
app.listen(port, () => {
   console.log(`server listening on port ${port}`);
});
