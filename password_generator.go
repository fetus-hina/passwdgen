package main

import "math/rand"

const (
	numbers       string = "0123456789"
	lowerAlphabet string = "abcdefghijklmnopqrstuvwxyz"
	upperAlphabet string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	symbols       string = `!"#$%&'()*+,-./:;<=>?@[]^_{|}~`
)

// PasswordGenerator ... パスワードジェネレータ
type PasswordGenerator struct {
	generator characterGenerator
	length    int
}

func newPasswordGenerator(pat Pattern, len int) PasswordGenerator {
	return PasswordGenerator{
		generator: newCharacterGenerator(pat),
		length:    len,
	}
}

func (gen PasswordGenerator) generate() (Password, error) {
	password := make([]byte, 0, gen.length)
	for len(password) < gen.length {
		password = append(password, gen.generator.generate())
	}

	return Password{
		Plain: string(password),
	}, nil
}

type characterGenerator struct {
	candidates string
}

func newCharacterGenerator(pat Pattern) characterGenerator {
	switch pat {
	case PatternFull:
		return characterGenerator{
			candidates: lowerAlphabet + upperAlphabet + numbers + symbols,
		}

	case PatternAlnum:
		return characterGenerator{
			candidates: lowerAlphabet + upperAlphabet + numbers,
		}

	case PatternAlpha:
		return characterGenerator{
			candidates: lowerAlphabet + upperAlphabet,
		}

	case PatternLowerAlnum:
		return characterGenerator{
			candidates: lowerAlphabet + numbers,
		}

	case PatternUpperAlnum:
		return characterGenerator{
			candidates: upperAlphabet + numbers,
		}

	case PatternNumber:
		return characterGenerator{
			candidates: numbers,
		}

	default:
		panic("Unknown pattern given")
	}
}

func (gen characterGenerator) generate() byte {
	index := rand.Intn(len(gen.candidates))
	return gen.candidates[index]
}
