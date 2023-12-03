const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// middleWares
app.use(cors());
app.use(express.json());

// verify token
const verifyToken = (req, res, next) => {
    // console.log('Inside verify Token :', req.headers.authorization)
    if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized Access" });
    }
    const token = req.headers.authorization.split(" ")[1];

    // verify the token
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            // console.log('invalid token')
            return res.status(401).send({ message: "Unauthorized Access" });
        }
        req.decoded = decoded;
        next();
    });
};

app.get("/", (req, res) => {
    res.send(`Server is running on PORT: ${port}`);
});

// Database connection
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.f30vajg.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        // all collections are here
        const userCollection = client.db("matrimony").collection("users");
        const biodataCollection = client.db("matrimony").collection("biodata")
        const reviewCollection = client.db("matrimony").collection("review")
        const favouriteCollection = client.db("matrimony").collection("favourite")
        const premiumRequestCollection = client.db("matrimony").collection("premiumRequest")


        // middleWare for verify admin
        // Verify admin after verify token
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === "admin";
            if (!isAdmin) {
              return res.status(403).send({ message: 'forbidden access' })
              
            }
          next()
        };

        // jwt token create send to the client
        // JWT related apis
        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: "1h",
            });

            // console.log(token);
            res.send({ token });
        });

        // post new user
        app.post("/post/user", async (req, res) => {
            const newUser = req.body;
            const query = { email: newUser.email };
            const existingUser = await userCollection.find(query).toArray();
            // console.log(existingUser)

            if (existingUser.length === 0) {
                const result = await userCollection.insertOne(newUser);
                // console.log(" user posted")
                return res.send(result);
            }
            return res.send({ message: "User already exist" });
        });

        // get user
        app.get("/get/users",verifyToken ,verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        //get premium users
        app.get("/premium/users", async (req, res) => {
            const query = { member: 'premium' };
            const result = await userCollection.find(query).toArray();
            res.send(result)
        })

        // get biodata filtering by email
        app.get("/biodata/:email", async (req, res) => {
            const email = req.params.email;
            // console.log(email)
            const query = { email: email };
            const result = await biodataCollection.findOne(query);

            console.log(result)
            res.send(result)
        })

        // post biodata
        app.put("/update/biodata", async (req, res) => {
            const newBiodata = req.body;
            const existingBiodata = await biodataCollection.findOne({ email: newBiodata.email });
        
            const lastBiodata = await biodataCollection.find().sort({ biodataId: -1 }).limit(1).toArray();
            
            if (existingBiodata) {
                const result = await biodataCollection.updateOne(
                    { email: newBiodata.email },
                    { $set: newBiodata }
                );
        
                res.send(result)
            }
            else {
                let biodataId = 1;
        
                if (lastBiodata.length > 0) {
                    biodataId = lastBiodata[0].biodataId + 1;
                }
                newBiodata.biodataId = biodataId;
                const result = await biodataCollection.insertOne(newBiodata);        
                res.send(result)
            }
        });
        

        // get all biodata
        app.get("/biodata", async (req, res) => {
            const result = await biodataCollection.find().toArray();
            res.send(result)
        })

        // get biodata count
        app.get("/biodataCount", async (req, res) => {
            const total = await biodataCollection.estimatedDocumentCount()
            const queryMale = { type: "male" }
            const queryFemale = { type: "female" }
            const male = await biodataCollection.find(queryMale).toArray();
            const female = await biodataCollection.find(queryFemale).toArray();
            res.send({total , male: male.length , female:female.length})
        })

        // get all success story or riview
        app.get("/review", async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result)
        })

        // post favourite profile email
        app.post("/favourite", async (req, res) => {
            const data = req.body;

            const existingId = await favouriteCollection.findOne(({ biodataId: data.biodataId }))
            
            if (!existingId) {
                const result = await favouriteCollection.insertOne(data)
                return res.send(result)
            }
            
            return res.send({message: "already added"})
        })


        // get favourite profile filtering by email

        app.get("/favourite/:email", async (req, res) => {
            const email = req.params.email            
            const query = { email: email }            
            const result = await favouriteCollection.find(query).toArray();
            res.send(result)
        })

        // delet data filtering by email and biodataId
        app.delete("/favourite/:id/:email" , async (req, res) => {
            const id = req.params.id;

            console.log(typeof (id))
            
            const email = req.params.email;

            const query = { biodataId: parseInt(id), email: email }
            
            const result = await favouriteCollection.deleteOne(query)
            
            res.send(result)
        })

        // post request for premium
        app.post("/premium", async (req, res) => {
            const newRequest = req.body;

            const existingRequest = await premiumRequestCollection.findOne({ email: newRequest.email })
            if (!existingRequest) {
                const result = await premiumRequestCollection.insertOne(newRequest);
                return res.send(result)
            }
            return res.send({meassage : "already requested"})
        })

        // admin get the all premium requests
        app.get("/premium",verifyToken , verifyAdmin, async (req, res) => {
            const result = await premiumRequestCollection.find().toArray();
            res.send(result)
        })

        // admin approved normal user to premium user
        app.patch("/premium/:email",verifyToken, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            // console.log(email)
            const filter = { email: email };
            const updateDoc = {
                $set: {
                    member: "premium",
                },
            };

            const result = await userCollection.updateOne(filter, updateDoc)

            res.send(result)
        })

        // make admin 
        app.patch("/make/admin/:email",verifyToken , verifyAdmin, async (req, res) => {
            const email = req.params.email;

            const filter = { email: email }
            const updateDoc = {
                $set: {
                    role : "admin"
                }
            }

            const result = await userCollection.updateOne(filter, updateDoc)
            
            res.send(result)

        })
        // Check admin by email
        app.get("/user/admin/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: "forbidden access" });
            }
            const query = { email: email };
            const user = await userCollection.findOne(query);

            let admin = false;
            if (user) {
                admin = user?.role === "admin";
            }

            // console.log(admin);
            res.send(admin);
        });

        console.log("Database connected succesfully");
    } finally {
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
