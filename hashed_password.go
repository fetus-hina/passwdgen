package main

import (
	"strings"
)

type HashedPassword struct {
	Md5      string
	Sha256   string
	Sha512   string
	Bcrypt   string
	Argon2i  string
	Argon2id string
}

func (p HashedPassword) String() string {
	return strings.Join(
		[]string{
			"MD5: " + p.Md5,
			"SHA-256: " + p.Sha256,
			"SHA-512: " + p.Sha512,
			"Bcrypt: " + p.Bcrypt,
			"Argon2i: " + p.Argon2i,
			"Argon2id: " + p.Argon2id,
		},
		"\n",
	)
}
