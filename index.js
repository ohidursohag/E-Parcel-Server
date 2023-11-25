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
      client.connect();
      // Send a ping to confirm a successful connection
      client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
   } finally {
      // Ensures that the client will close when you finish/error
      // await client.close();
   }
}
run().catch(console.dir);

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

// Test Api
app.get('/', (req, res) => {
   res.send('Server is Running');
})
app.listen(port, () => {
   console.log(`server listening on port ${port}`);
});
