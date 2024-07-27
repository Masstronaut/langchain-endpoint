## ImprovGPT API

The server exposes an endpoint on the `/skit` route which accepts requests containing a json body with a scenario field that describes a scenario.

The API will then orchestrate openAI's `gpt-4o-mini` model into a trio of comedians who will perform an improv skit on the scenario provided.

```json
{
	"scenario": "A software engineer applies for a job at an AI startup"
}
```

You can provide a `thread_id` from a previous conversation to have the trio of comedians continue their skit. If so, the included `scenario` will be used to send the skit in a new direction:

```json
{
	"scenario": "The job candidate discovers that their interviewer is actually an AI",
	"thread_id": "thread_someThread123"
}
```

The API spec is documented at [api.json](api.json), though details of the server sent event stream are not included as to my knowledge SSE isn't supported by openAPI.

## Server setup

Building the server requires a machine with [deno](https://deno.com/) installed.

### Environment

The server expects two environment variables to be present:

1. OPENAI_API_KEY - this must be an OpenAI API key with credits available to make API calls to gpt-4o-mini.
2. DATABASE_URL - This should be a postgres connection string that includes the protocol, username, and password. For example: `postgresql://user:pass@db.host.com/database_name`

The server will automatically load the variables from a `.env` file in the current working directly if present.

### Database Migrations

Once Deno is installed, you can use the following two commands to generate and apply the database migrations for a new database:

1. `deno task migrate:generate` - generates a migration sql file that can be used to apply the migrations.
2. `deno task migrate:apply` - applies all generated migrations which have not already been applied in the database. Skips any migrations already applied.

### Build & run the server

1. `deno task start` - Starts a local development server. By default it listens on port 8000 for requests.
2. `deno task build` - Builds a standalone executable file. Use `./build/server` to run it.

Note that the standalone server executable still requires the environment variables be present

## Library selection

- Deno is the fastest JS server runtime supported by langgraph (bun is not supported)
- DrizzleORM provides great type safety for DB queries in TS, and is easier to learn and optimize than alternatives like prisma due to its similarity to SQL and guarantee of always producing exactly 1 SQL statement.
- Postgres.JS was chosen because it is host-agnostic and has the [best performance](https://github.com/porsager/postgres) among fully featured postgres clients for node & deno.
  - Note: it's very important to use the postgres package from deno.land/x/ - the npm distribution isn't compatible with deno and will timeout on every request.
- nanoIDs are URL friendly, shorter than UUIDs, and fast to generate.
- zod is a powerful schema validator with excellent typing support and a great API.
