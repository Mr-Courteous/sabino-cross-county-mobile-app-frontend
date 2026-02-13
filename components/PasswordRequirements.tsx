import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { validatePassword, PasswordRequirement } from '@/utils/password-validator';

interface PasswordRequirementsProps {
    password: string;
    style?: any;
}

export function PasswordRequirements({ password, style }: PasswordRequirementsProps) {
    const validation = validatePassword(password);

    return (
        <View style={[styles.container, style]}>
            <Text style={styles.title}>Password must include:</Text>
            {validation.requirements.map((req, index) => (
                <View key={index} style={styles.requirement}>
                    <Ionicons
                        name={req.met ? 'checkmark-circle' : 'close-circle'}
                        size={16}
                        color={req.met ? '#10B981' : '#94A3B8'}
                        style={styles.icon}
                    />
                    <Text style={[styles.text, req.met && styles.textMet]}>
                        {req.label}
                    </Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    title: {
        fontSize: 12,
        fontWeight: '600',
        color: '#E2E8F0',
        marginBottom: 8,
    },
    requirement: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    icon: {
        marginRight: 8,
    },
    text: {
        fontSize: 12,
        color: '#94A3B8',
    },
    textMet: {
        color: '#10B981',
        textDecorationLine: 'line-through',
    },
});
