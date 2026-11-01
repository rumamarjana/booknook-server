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
   const {id} =req.params;
   const result = await bookCollection.findOne({_id:new ObjectId(id)});
   res.send(result)
 })
 



// http://localhost:8000/books/id

app.get('/', (req, res) => {
  res.send('Server Running ')
})

app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`)
})