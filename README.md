# ToDoList

Une application **API REST** développée avec **Express.js (Node.js)** pour gérer ta liste de tâches depuis le navigateur ou via des requêtes HTTP.  
L’architecture suit le modèle **MVC (Model–View–Controller)**.  
**Persistance des données : PostgreSQL** (accès via le driver `pg`). Les tâches sont exposées **par index**.

---

## Fonctionnalités

* Ajouter une nouvelle tâche  
* Afficher la liste des tâches  
* Supprimer une tâche  
* Endpoint de vérification de l’état du serveur (`/health`)

---

## Installation

1. **Télécharger** ou **cloner** le projet :

```bash
git clone https://github.com/ton-utilisateur/Exercice2_Hamza_NADIFI.git
cd Exercice2_Hamza_NADIFI
```

2. S’assurer d’avoir **Node.js 18+** installé.

3. Installer toutes les dépendances :

```bash
npm install
```
4. Configurer la base PostgreSQL

Vous lancer la commande suivante en remplissant les champs demandés:

```bash
npm run db:setup 
```

6. Démarrage en production
```bash
npm run start
```


7. Lancer le serveur Express :
```bash
npm run dev
```

---

## Utilisation

1. Vérifier que l’API répond :
```bash
curl http://127.0.0.1:5050/health
```

- Retour :
```json
{"status":"ok","message":"L'API fonctionne"}
```

2. Liste les tâches :
```bash
curl http://127.0.0.1:5050/api/tasks
```

3. Ajoute une tâche :
```bash
curl -X POST http://127.0.0.1:5050/api/tasks      -H "Content-Type: application/json"      -d '{"title":"Apprendre Express"}'
```

4. Supprime une tâche :
```bash
curl -X DELETE http://127.0.0.1:5050/api/tasks/1
```

---

## Structure du projet

```
EXERCICE2_HAMZA_NADIFI/
├── server.js                   # Point d'entrée principal du serveur Express
├── src/
│   ├── models/
│   │   └── Task.js             # Model : définit la classe Task
│   ├── controllers/
│   │   └── todoController.js   # Controller : logique métier (ajout, maj, suppression)
│   ├── routes/
│   │   └── taskRoutes.js       # Routes : gère les endpoints de l’API
│   └── config/
│       └── db.js               # Connexion PostgreSQL (pg Pool)
├── package.json                # Dépendances et scripts
├── .env                        # Variables d’environnement (non commité)
└── README.md

```

---

## Architecture MVC

Le projet respecte le modèle **MVC (Model–View–Controller)** :

| Couche         | Rôle                                  | Exemple                                           |
| -------------- | ------------------------------------- | ------------------------------------------------- |
| **Model**      | Gère les données et la logique métier | `Task`, structure et transformation des données   |
| **View**       | (Non applicable ici) — pas d’IHM CLI  | Les réponses JSON remplacent la vue terminal      |
| **Controller** | Fait le lien entre Model et Routes    | `ToDoController` (requêtes SQL via pg)   |


---

## Rendu des manipulations de l'API via Postman:

#### Vérification de l’état de l’API
![health](./assets/health.png)

#### Liste toutes les tâches
![list](./assets/displayTasks.png)

#### Crée une nouvelle tâche
![new](./assets/addTask.png)

#### Supprime une tâche par ID
![delete](./assets/deleteTaskById.png)
