import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1785938302963 implements MigrationInterface {
    name = 'InitSchema1785938302963'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "bookings" ("id" uuid NOT NULL, "event_type_id" uuid, "event_type_name" character varying NOT NULL, "duration_minutes" integer NOT NULL, "start_time" TIMESTAMP WITH TIME ZONE NOT NULL, "end_time" TIMESTAMP WITH TIME ZONE NOT NULL, "guest_name" character varying NOT NULL, "guest_email" character varying NOT NULL, "status" character varying NOT NULL, "cancellation_reason" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "cancellation_token" character varying NOT NULL, CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c86c8c7fd999578f6b786b9549" ON "bookings"  ("start_time", "end_time") `);
        await queryRunner.query(`CREATE TABLE "event_types" ("id" uuid NOT NULL, "name" character varying NOT NULL, "description" character varying NOT NULL, "duration_minutes" integer NOT NULL, CONSTRAINT "PK_ffe6b2d60596409fb08fb13830d" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "event_types"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c86c8c7fd999578f6b786b9549"`);
        await queryRunner.query(`DROP TABLE "bookings"`);
    }

}
