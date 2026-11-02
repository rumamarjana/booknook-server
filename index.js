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




// POST /borrow-book → record a borrow, decrement available copies
app.post('/borrow-book', async (req, res) => {
  try {
    const { bookId, bookTitle, name, email, borrowDate, returnDate } = req.body;

    if (!bookId || !name || !email || !returnDate) {
      return res.status(400).send({ error: 'Missing required fields' });
    }

    const borrowCollection = db.collection('borrow');

    // Only allow the borrow if a copy is actually available
    const book = await bookCollection.findOne({ _id: new ObjectId(bookId) });
    if (!book) return res.status(404).send({ error: 'Book not found' });

    const available = Number(book.totalCopies ?? 0);

    if (available <= 0) {
      return res.status(409).send({ error: 'No copies available right now' });
    }

    const result = await borrowCollection.insertOne({
      bookId: new ObjectId(bookId),
      bookTitle,
      name,
      email,
      borrowDate: borrowDate || new Date().toISOString(),
      returnDate,
      createdAt: new Date().toISOString(),
    });

    await bookCollection.updateOne(
      { _id: new ObjectId(bookId) },
      { $inc: { totalCopies: -1 } }
    );

    res.send(result)
  } catch (err) {
    console.error(err)
    res.status(500).send({ error: 'Something went wrong while borrowing' });
  }
})

// http://localhost:8000/books/id

app.get('/', (req, res) => {
  res.send('Server Running ')
})

app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`)
})