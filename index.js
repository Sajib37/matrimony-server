const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
require("dotenv").config();



// middleWares
app.use(cors());
app.use(express.json());



app.get("/", (req, res) => {
    res.send(`Server is running on PORT: ${port}`);
});


// Database connection
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri =`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.f30vajg.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        
        const userCollection = client.db('matrimony').collection('users')


        // post new user
        app.post("/post/user", async (req, res) => {
            const newUser = req.body;
            const query = { email: newUser.email };
            const existingUser = await userCollection.find(query).toArray();
            // console.log(existingUser.length)

            if (existingUser.length === 0) {
                const result = await userCollection.insertOne(newUser);
                return res.send(result);
            }
            return res.send({ message: "User already exist" });
        });

        console.log('Database connected succesfully')
    } finally {
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
