# Eval-runner contract per FE refinement §20.
# Each step exits non-zero on failure.

.PHONY: eval install lint type-check test build e2e clean

eval: install lint type-check test build e2e

install:
	npm ci

lint:
	npx ng lint

type-check:
	npx tsc -p tsconfig.json --noEmit

test:
	npm test -- --watch=false --browsers=ChromeHeadless

build:
	npm run build -- --configuration=production

e2e:
	npx playwright install --with-deps chromium
	npx playwright test

clean:
	rm -rf dist node_modules playwright-report test-results

gen-api:
	npx openapi-typescript ../hackathon-may-2026-attendance-portal/dev-extras/integration/api-reference.yaml -o src/shared/http/generated/api-schema.ts
