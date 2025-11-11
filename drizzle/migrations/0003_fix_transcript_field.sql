-- Fix transcript field default value
-- Change from empty array [] to null (transcript is an object, not an array)
ALTER TABLE "mind_flow_items" ALTER COLUMN "transcript" DROP DEFAULT;
