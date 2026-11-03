.PHONY: all build typecheck test clean

all: build

build: typecheck
	npm run build

typecheck:
	npm run typecheck

test:
	npm test

clean:
	npm run clean
