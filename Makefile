BINARIES := \
	bin/passwdgen.arm \
	bin/passwdgen.mac.x64 \
	bin/passwdgen.x64 \
	bin/passwdgen.x64.exe \
	bin/passwdgen.x86 \
	bin/passwdgen.x86.exe

SOURCES := $(wildcard *.go)

.PHONY: all
all: .gitignore $(BINARIES)

.PHONY: clean
clean:
	rm -rfv $(BINARIES) vendor

.PHONY: $(SOURCES)
$(SOURCES):
	gofmt -w -s $@

.gitignore: .gitignore.in
	curl -fsSL 'https://www.gitignore.io/api/go,vim,emacs,visualstudiocode' | cat - $< > $@

vendor: go.mod go.sum
	go mod vendor
	@touch $@

bin/passwdgen.arm: vendor $(SOURCES)
	@mkdir -p bin
	GOOS=linux GOARCH=arm go build -o $@ .

bin/passwdgen.mac.x64: vendor $(SOURCES)
	@mkdir -p bin
	GOOS=darwin GOARCH=amd64 go build -o $@ .

bin/passwdgen.x64: vendor $(SOURCES)
	@mkdir -p bin
	GOOS=linux GOARCH=amd64 go build -o $@ .
	strip $@

bin/passwdgen.x64.exe: vendor $(SOURCES)
	@mkdir -p bin
	GOOS=windows GOARCH=amd64 go build -o $@ .
	strip $@

bin/passwdgen.x86: vendor $(SOURCES)
	@mkdir -p bin
	GOOS=linux GOARCH=386 go build -o $@ .
	strip $@

bin/passwdgen.x86.exe: vendor $(SOURCES)
	@mkdir -p bin
	GOOS=windows GOARCH=386 go build -o $@ .
	strip $@
