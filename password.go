package main

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"github.com/GehirnInc/crypt"
	_ "github.com/GehirnInc/crypt/md5_crypt"
	_ "github.com/GehirnInc/crypt/sha256_crypt"
	_ "github.com/GehirnInc/crypt/sha512_crypt"
	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/bcrypt"
	"strings"
)

// Password ... 生成されたパスワードを表す構造体
type Password struct {
	Plain string
}

func (p Password) Hash() HashedPassword {
	return HashedPassword{
		Md5:      p.MD5Hash(),
		Sha256:   p.SHA256Hash(),
		Sha512:   p.SHA512Hash(),
		Bcrypt:   p.BcryptHash(),
		Argon2i:  p.Argon2iHash(),
		Argon2id: p.Argon2idHash(),
	}
}

// MD5Hash ... MD5 ハッシュ化パスワードを生成
func (p Password) MD5Hash() string {
	if str, err := p.cryptHash(crypt.MD5.New(), "$1$"+p.salt(8)); err != nil {
		panic(err)
	} else {
		return str
	}
}

// SHA256Hash ... SHA-256 ハッシュ化パスワードを生成
func (p Password) SHA256Hash() string {
	if str, err := p.cryptHash(crypt.SHA256.New(), "$5$"+p.salt(16)); err != nil {
		panic(err)
	} else {
		return str
	}
}

// SHA512Hash ... SHA-512 ハッシュ化パスワードを生成
func (p Password) SHA512Hash() string {
	if str, err := p.cryptHash(crypt.SHA512.New(), "$6$"+p.salt(16)); err != nil {
		panic(err)
	} else {
		return str
	}
}

// BcryptHash ... Bcrypt ハッシュ化パスワードを生成
func (p Password) BcryptHash() string {
	if bytes, err := bcrypt.GenerateFromPassword([]byte(p.Plain), bcrypt.DefaultCost); err != nil {
		panic(err)
	} else {
		return string(bytes)
	}
}

func (p Password) Argon2iHash() string {
	return p.argon2Hash("argon2i", argon2.Key)
}

func (p Password) Argon2idHash() string {
	return p.argon2Hash("argon2id", argon2.IDKey)
}

func (p Password) argon2Hash(algoTag string, hashFunc func([]byte, []byte, uint32, uint32, uint8, uint32) []byte) string {
	return p.argon2HashImpl(algoTag, 4, 65536, 1, hashFunc)
}

func (p Password) argon2HashImpl(
	algoTag string,
	time uint32,
	memory uint32,
	threads uint8,
	hashFunc func([]byte, []byte, uint32, uint32, uint8, uint32) []byte,
) string {
	saltBin := p.binarySalt(16)
	bytes := hashFunc([]byte(p.Plain), saltBin, time, memory, threads, 32)
	return fmt.Sprintf(
		"$%s$v=%d$m=%d,t=%d,p=%d$%s$%s",
		algoTag,
		argon2.Version,
		memory,
		time,
		threads,
		p.b64WithoutPadding(saltBin),
		p.b64WithoutPadding(bytes),
	)
}

func (p Password) b64WithoutPadding(binary []byte) string {
	return base64.RawStdEncoding.EncodeToString(binary)
}

func (p Password) String() string {
	result := p.Plain + "\n"
	for _, line := range strings.Split(p.Hash().String(), "\n") {
		result += "    " + line + "\n"
	}
	return result
}

func (p Password) cryptHash(algo crypt.Crypter, prefix string) (string, error) {
	return algo.Generate([]byte(p.Plain), []byte(prefix))
}

func (p Password) salt(length int) string {
	generator := newCharacterGenerator(PatternAlnum)
	result := make([]byte, 0, length)
	for len(result) < length {
		result = append(result, generator.generate())
	}
	return string(result)
}

func (p Password) binarySalt(length int) []byte {
	result := make([]byte, length)
	if _, err := rand.Read(result); err != nil {
		panic(err)
	}
	return result
}
