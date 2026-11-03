import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';
import cors from 'cors'
const app = express();
const PORT = 8000;



const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
app.use(cors())
app.use(express.json())




const mongoClient = await connectToMongoDB()
const db = mongoClient.db("booknook_db")
const bookCollection =  db.collection("book")
const borrowCollection = db.collection('borrows');





app.post('/add-book', async (req,res) =>{

  const data = req.body
  const result = await bookCollection.insertOne(data);
  res.send(result)
});


app.get('/books',async (req,res) =>{
  const result = await bookCollection.find().toArray();
     res.send(result);
})

app.get('/books/:id',async(req,res) =>{
   try {
     const {id} =req.params;
     const result = await bookCollection.findOne({_id:new ObjectId(id)});
     if (!result) return res.status(404).send(null);
     res.send(result)
   } catch (err) {
     
     res.status(404).send(null)
   }
})
 
app.patch('/books/:id',async(req,res)=>{
   const {id} = req.params
  const data = req.body;
  const result = await bookCollection.updateOne({_id:new  ObjectId(id)},
     {$set:data}
    );
   res.send(result);
})


app.delete('/book/:id', async(req, res) => {
  const {id} = req.params
  const result = await bookCollection.deleteOne({_id: new ObjectId(id)})
  res.json(result)
})

app.post('/borrows', async (req, res) => {
    const data = req.body;
  const result = await bookingCollection.insertOne(data)
  res.send(result)

    res.send(result);
});
app.post('/borrow', async(req, res) => {
  const data = req.body
  const result = await borrowCollection.insertOne(data)
  res.send(result)
})



app.get('/my-borrows/:email', async(req, res) => {
  const {email} = req.params
  const result= await borrowCollection.find({userEmail:email}).toArray()
  res.send(result)
})




// http://localhost:8000/books/id

app.get('/', (req, res) => {
  res.send('Server Running ')
})

app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`)
})