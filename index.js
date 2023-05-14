const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

//  middleware
app.use(cors());
app.use(express.json());

console.log(process.env.DB_PASS);

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3ztqljx.mongodb.net/?retryWrites=true&w=majority`

const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-iu5stap-shard-00-00.3ztqljx.mongodb.net:27017,ac-iu5stap-shard-00-01.3ztqljx.mongodb.net:27017,ac-iu5stap-shard-00-02.3ztqljx.mongodb.net:27017/?ssl=true&replicaSet=atlas-6ti1ov-shard-0&authSource=admin&retryWrites=true&w=majority`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyJWT = (req, res, next) =>{
  console.log('hitting verify jwt');
  console.log(req.headers.authorization);

  const authorization = req.headers.authorization;

  if(!authorization){
    return res.status(401).send({error: true, message: 'unauthorized access'})
  }
  const token = authorization.split(' ')[1];
  console.log('token inside verify jwt', token);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded)=>{
    if(error){
      return req.status(403).send({error: true, message: 'unauthorized access'})
    }
    req.decoded = decoded;
    next()
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db('carDoctors').collection('services');
    const bookingCollection = client.db('carDoctors').collection('booking')

    // JWT

    app.post('/jwt', (req, res)=>{
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      });
      console.log({token});
      res.send({token})
    })

    // services routes

    app.get('/services', async(req, res)=>{
        const cursor = serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result)
    })

    app.get('/services/:id', async(req, res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}

        const options = {
            // Include only the `title` and `imdb` fields in the returned document
            projection: { title: 1, price: 1, service_id: 1, img: 1 },
          };

        const result = await serviceCollection.findOne(query, options);
        res.send(result);
    })

    // booking routes

    app.get('/bookings', verifyJWT, async(req, res)=>{

      console.log('came back after verify');

        let query = {};
        if(req.query?.email){
            query = { email: req.query.email }
        }
        const result = await bookingCollection.find(query).toArray();
        res.send(result)
    })

    app.post('/booking', async(req, res)=>{
        const booking = req.body;
        console.log(booking);
        const result = await bookingCollection.insertOne(booking)
        res.send(result)
    })

    app.patch('/bookings/:id', async(req, res)=>{
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)}
        const updatedBooking = req.body;
        console.log(updatedBooking);
        const updatedDoc = {
            $set: {
              status: updatedBooking.status
            },
          };

          const result = await bookingCollection.updateOne(filter, updatedDoc)
          res.send(result)

    })

    app.delete('/bookings/:id', async (req, res)=> {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await bookingCollection.deleteOne(query)
        res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res)=>{
    res.send(' Car Doctor Server is running')
})

app.listen(port, ()=>{
    console.log(`Car Doctor Server is running on port: ${port}`);
})