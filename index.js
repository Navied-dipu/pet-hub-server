require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const port = 5000;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("petHub");
    const petCollection = db.collection("petCollection");
    const adoptionCollection = db.collection("adoptionCollection");

    // ─────────────────────────────────────────────
    // Pet Collection Routes
    // ─────────────────────────────────────────────

    app.post("/add-pet", async (req, res) => {
      const pet = req.body;
      const result = await petCollection.insertOne(pet);
      res.send(result);
    });

   
    app.get("/pets", async (req, res) => {
      const { search, species, sort } = req.query;

      const query = {};

      if (search && search.trim() !== "") {
        query.petName = {
          $regex: search.trim(),
          $options: "i", 
        };
      }

      if (species && species.trim() !== "") {
        const speciesArray = species
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        if (speciesArray.length > 0) {
          query.species = { $in: speciesArray };
        }
      }

      
      const sortOption = {};
      if (sort === "asc") {
        sortOption.petName = 1;
      } else if (sort === "desc") {
        sortOption.petName = -1;
      }

      const result = await petCollection
        .find(query)
        .sort(sortOption)
        .toArray();

      res.json(result);
    });

    app.get("/pets/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await petCollection.findOne(query);
      res.json(result);
    });

    app.put("/pets/:id", async (req, res) => {
      const { id } = req.params;
      const filter = { _id: new ObjectId(id) };
      const updatedPet = req.body;
      const updateDoc = {
        $set: {
          petName: updatedPet.petName,
          species: updatedPet.species,
          breed: updatedPet.breed,
          age: updatedPet.age,
          gender: updatedPet.gender,
          image: updatedPet.image,
          healthStatus: updatedPet.healthStatus,
          vaccinationStatus: updatedPet.vaccinationStatus,
          location: updatedPet.location,
          adoptionFee: updatedPet.adoptionFee,
          description: updatedPet.description,
          status: updatedPet.status || "Available",
        },
      };
      const result = await petCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/pets/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await petCollection.deleteOne(query);
      res.send(result);
    });

    // ─────────────────────────────────────────────
    // Adoption Collection Routes
    // ─────────────────────────────────────────────

    app.post("/adopt", async (req, res) => {
      const adoptionData = req.body;
      const result = await adoptionCollection.insertOne(adoptionData);
      res.send(result);
    });

    app.get("/adoption-requests/pet/:petId", async (req, res) => {
      const { petId } = req.params;
      const query = { petId: petId };
      const result = await adoptionCollection.find(query).toArray();
      res.json(result);
    });

    app.get("/my-adoptions/:email", async (req, res) => {
      const { email } = req.params;
      const query = { userEmail: email };
      const result = await adoptionCollection.find(query).toArray();
      res.json(result);
    });

    app.put("/adopt/:id", async (req, res) => {
      const { id } = req.params;
      const { status, petId } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { status: status } };
      const result = await adoptionCollection.updateOne(filter, updateDoc);

      if (status === "approved" && petId) {
        const petFilter = { _id: new ObjectId(petId) };
        await petCollection.updateOne(petFilter, {
          $set: { status: "Adopted" },
        });
      }
      res.send(result);
    });

    app.delete("/adopt/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await adoptionCollection.deleteOne(query);
      res.send(result);
    });

    // MongoDB ping
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Pinged your deployment. Successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

// default route
app.get("/", (req, res) => {
  res.send("🐾 Pet Hub Server Running");
});

// server start
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});