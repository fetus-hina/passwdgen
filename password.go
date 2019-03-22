package main

import (
	"github.com/GehirnInc/crypt"
	_ "github.com/GehirnInc/crypt/md5_crypt"
	_ "github.com/GehirnInc/crypt/sha256_crypt"
	_ "github.com/GehirnInc/crypt/sha512_crypt"
	"golang.org/x/crypto/bcrypt"
)

// Password ... 生成されたパスワードを表す構造体
type Password struct {
	plain string
}

// Md5Hash ... MD5 ハッシュ化パスワードを生成
func (p Password) Md5Hash() string {
	if str, err := p.cryptHash(crypt.MD5.New(), "$1$"+p.salt(8)); err != nil {
		panic(err)
	} else {
		return str
	}
}

// Sha256Hash ... SHA-256 ハッシュ化パスワードを生成
func (p Password) Sha256Hash() string {
	if str, err := p.cryptHash(crypt.SHA256.New(), "$5$"+p.salt(16)); err != nil {
		panic(err)
	} else {
		return str
	}
}

// Sha512Hash ... SHA-512 ハッシュ化パスワードを生成
func (p Password) Sha512Hash() string {
	if str, err := p.cryptHash(crypt.SHA512.New(), "$6$"+p.salt(16)); err != nil {
		panic(err)
	} else {
		return str
	}
}

// BcryptHash ... Bcrypt ハッシュ化パスワードを生成
func (p Password) BcryptHash() string {
	if bytes, err := bcrypt.GenerateFromPassword([]byte(p.plain), bcrypt.DefaultCost); err != nil {
		panic(err)
	} else {
		return string(bytes)
	}
}

func (p Password) String() string {
	return p.plain + "\n" +
		"    MD5:     " + p.Md5Hash() + "\n" +
		"    SHA-256: " + p.Sha256Hash() + "\n" +
		"    SHA-512: " + p.Sha512Hash() + "\n" +
		"    Bcrypt:  " + p.BcryptHash()
}

func (p Password) cryptHash(algo crypt.Crypter, prefix string) (string, error) {
	return algo.Generate([]byte(p.plain), []byte(prefix))
}

func (p Password) salt(length int) string {
	generator := newCharacterGenerator(PatternAlnum)
	result := make([]byte, 0, length)
	for len(result) < length {
		result = append(result, generator.generate())
	}
	return string(result)
}
