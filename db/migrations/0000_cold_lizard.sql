CREATE TABLE IF NOT EXISTS "checkpoint" (
	"thread_id" text NOT NULL,
	"checkpoint_id" text NOT NULL,
	"parent_id" text,
	"checkpoint" "bytea" NOT NULL,
	"metadata" "bytea" NOT NULL,
	CONSTRAINT "checkpoint_thread_id_checkpoint_id_pk" PRIMARY KEY("thread_id","checkpoint_id")
);
