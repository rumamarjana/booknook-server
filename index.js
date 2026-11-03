import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';
import cors from 'cors'
import { createRemoteJWKSet, jwtVerify } from 'jose';
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
const bookCollection = db.collection("book")
const borrowCollection = db.collection('borrows');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ msg: "Unauthorized!" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({ msg: "Unauthorized!" });
  }


  // const JWKS = createRemoteJWKSet(new URL(process.env.))
     const JWKS = createRemoteJWKSet(
    new URL(`${process.env.JWKS_URL}/api/auth/jwks`),
  );

 try {
    const { payload } = await jwtVerify(token, JWKS);
    next();
  } catch (error) {
    return res.status(500).send({ msg: "Server Error!" });
  }

}



app.post('/add-book', verifyToken, async (req, res) => {

  const data = req.body
  data.totalCopies = Number(data.totalCopies);
  const result = await bookCollection.insertOne(data);
  res.send(result)
});


app.get('/books', async (req, res) => {
  const result = await bookCollection.find().toArray();
  res.send(result);
})

app.get('/books/:id', verifyToken, async (req, res) => {
  const authHeader = req.headers.authorization;
  console.log(authHeader)
  try {
    const { id } = req.params;
    const result = await bookCollection.findOne({ _id: new ObjectId(id) });
    if (!result) return res.status(404).send(null);
    res.send(result)
  } catch (err) {

    res.status(404).send(null)
  }
})

app.patch('/books/:id', verifyToken, async (req, res) => {
  const { id } = req.params
  const data = req.body;
  const result = await bookCollection.updateOne({ _id: new ObjectId(id) },
    { $set: data }
  );
  res.send(result);
})


app.delete('/book/:id', verifyToken, async (req, res) => {
  const { id } = req.params
  const result = await bookCollection.deleteOne({ _id: new ObjectId(id) })
  res.json(result)
})

app.post("/borrows", verifyToken, async (req, res) => {
  try {
    const borrowData = req.body;
    const { bookId, userEmail } = borrowData;

    // Check duplicate borrow
    const alreadyBorrowed = await borrowCollection.findOne({
      bookId,
      userEmail,
      status: "borrowed",
    });

    if (alreadyBorrowed) {
      return res.status(400).send({
        success: false,
        message: "You have already borrowed this book!",
      });
    }

    // Decrease totalCopies by 1
    const bookResult = await bookCollection.updateOne(
      {
        _id: new ObjectId(bookId),
        totalCopies: { $gt: 0 },
      },
      {
        $inc: { totalCopies: -1 },
      }
    );

    if (bookResult.modifiedCount === 0) {
      return res.status(400).send({
        success: false,
        message: "Book is not available!",
      });
    }

    // Insert borrow data
    const result = await borrowCollection.insertOne({
      ...borrowData,
      status: "borrowed",
      borrowDate: new Date(),
      returnDate: null,
      createdAt: new Date(),
    });

    res.status(201).send({
      success: true,
      message: "Book borrowed successfully!",
      result,
    });

  } catch (error) {
    console.error("Borrow Error:", error);

    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});
app.post('/borrow', async (req, res) => {
  const data = req.body
  const result = await borrowCollection.insertOne(data)
  res.send(result)
})



app.get("/my-borrows", verifyToken, async (req, res) => {
  try {
    const { email } = req.query;

    console.log("Requested Email:", email);

    if (!email) {
      return res.status(400).send({
        message: "Email is required",
      });
    }

    const result = await borrowCollection
      .find({ userEmail: email })
      .sort({ createdAt: -1 })
      .toArray();

    console.log("Borrowed Books:", result);

    res.status(200).send(result);

  } catch (error) {
    console.error("GET MY BORROWS ERROR:", error);

    res.status(500).send({
      message: "Failed to fetch borrowed books",
    });
  }
});

app.delete("/borrows/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check valid MongoDB ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid borrow ID",
      });
    }

    // Find borrow data
    const borrow = await borrowCollection.findOne({
      _id: new ObjectId(id),
      status: "borrowed",
    });

    if (!borrow) {
      return res.status(404).send({
        success: false,
        message: "Borrow not found or already returned",
      });
    }

    // Validate bookId
    if (!ObjectId.isValid(String(borrow.bookId))) {
      return res.status(400).send({
        success: false,
        message: "Invalid book ID",
      });
    }

    // Update borrow status
    const result = await borrowCollection.updateOne(
      {
        _id: new ObjectId(id),
        status: "borrowed",
      },
      {
        $set: {
          status: "returned",
          returnDate: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(409).send({
        success: false,
        message: "Book already returned",
      });
    }

    // Increase totalCopies by 1
    const bookResult = await bookCollection.updateOne(
      {
        _id: new ObjectId(String(borrow.bookId)),
      },
      {
        $inc: {
          totalCopies: 1,
        },
      }
    );

    if (bookResult.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Book not found",
      });
    }

    res.send({
      success: true,
      message: "Book returned successfully!",
    });

  } catch (error) {
    console.error("Return API Error:", error);

    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});










// http://localhost:8000/my-borrows

app.get('/', (req, res) => {
  res.send('Server Running ')
})

app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`)
})

export default app